import { describe, expect, it } from "vitest";

import { detectFileType, validateFileTypeSupport } from "./fileDetection.js";

const mockSdk = { console: { log: () => {} } } as unknown as Parameters<
  typeof detectFileType
>[0];

describe("detectFileType", () => {
  it("detects Postman collection", () => {
    const content = JSON.stringify({
      info: {
        name: "Test",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    });
    const result = detectFileType(mockSdk, content, "collection.json");
    expect(result.type).toBe("postman");
    expect(result.confidence).toBe(0.95);
  });

  it("detects OpenAPI 3 spec", () => {
    const content = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "API", version: "1.0" },
      paths: {},
    });
    const result = detectFileType(mockSdk, content, "openapi.json");
    expect(result.type).toBe("openapi");
    expect(result.confidence).toBe(0.95);
  });

  it("detects Insomnia export", () => {
    const content = JSON.stringify({
      resources: [
        { _type: "Workspace", name: "W" },
        {
          _type: "Request",
          parentId: "w1",
          name: "R",
          method: "GET",
          url: "https://x.com",
        },
      ],
    });
    const result = detectFileType(mockSdk, content, "insomnia.json");
    expect(result.type).toBe("insomnia");
    expect(result.confidence).toBe(0.95);
  });

  it("detects Bruno OpenCollection YAML", () => {
    const content = `
info:
  name: Get
  type: http
http:
  method: GET
  url: https://api.example.com/users
`;
    const result = detectFileType(mockSdk, content, "bruno.yaml");
    expect(result.type).toBe("bruno");
    expect(result.confidence).toBe(0.95);
  });

  it("detects Postman environment", () => {
    const content = JSON.stringify({
      name: "Dev",
      _postman_variable_scope: "environment",
      values: [
        { key: "baseUrl", value: "https://api.example.com", enabled: true },
      ],
    });
    const result = detectFileType(mockSdk, content, "environment.json");
    expect(result.type).toBe("environment");
    expect(result.confidence).toBe(0.95);
  });

  it("returns unknown for invalid JSON and non-YAML", () => {
    const result = detectFileType(mockSdk, "not json", "file.txt");
    expect(result.type).toBe("unknown");
  });
});

describe("validateFileTypeSupport", () => {
  it("returns supported for postman", () => {
    const v = validateFileTypeSupport("postman", "c.json");
    expect(v.supported).toBe(true);
  });

  it("returns supported for bruno", () => {
    const v = validateFileTypeSupport("bruno", "b.yaml");
    expect(v.supported).toBe(true);
  });

  it("returns unsupported for unknown", () => {
    const v = validateFileTypeSupport("unknown", "x.txt");
    expect(v.supported).toBe(false);
  });
});
