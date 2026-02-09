import { describe, expect, it } from "vitest";

import { parseAllDocuments, parseFirstDocument } from "./minimalYaml.js";

describe("parseFirstDocument", () => {
  it("returns first document from single-doc content", () => {
    const yaml = `
info:
  name: Get User
  type: http
http:
  method: GET
  url: https://api.example.com/users/1
`;
    const doc = parseFirstDocument(yaml);
    expect(doc).toBeDefined();
    const info = doc?.info as Record<string, unknown>;
    const http = doc?.http as Record<string, unknown>;
    expect(info?.name).toBe("Get User");
    expect(info?.type).toBe("http");
    expect(http?.method).toBe("GET");
    expect(http?.url).toBe("https://api.example.com/users/1");
  });

  it("returns first document only from multi-doc content", () => {
    const yaml = `
info:
  name: First
  type: http
http:
  method: GET
  url: https://example.com/a
---
info:
  name: Second
  type: http
http:
  method: POST
  url: https://example.com/b
`;
    const doc = parseFirstDocument(yaml);
    expect(doc).toBeDefined();
    const info = doc?.info as Record<string, unknown>;
    expect(info?.name).toBe("First");
    const http = doc?.http as Record<string, unknown>;
    expect(http?.method).toBe("GET");
  });

  it("returns undefined for empty or whitespace-only content", () => {
    expect(parseFirstDocument("")).toBeUndefined();
    expect(parseFirstDocument("   \n  ")).toBeUndefined();
  });

  it("parses headers array with name/value pairs", () => {
    const yaml = `
info:
  name: With Headers
  type: http
http:
  method: GET
  url: https://api.example.com/users
  headers:
    - name: Accept
      value: application/json
    - name: X-Request-ID
      value: abc-123
`;
    const doc = parseFirstDocument(yaml);
    expect(doc).toBeDefined();
    const http = doc?.http as Record<string, unknown>;
    const headers = http?.headers as Array<{ name?: string; value?: string }>;
    expect(Array.isArray(headers)).toBe(true);
    expect(headers.length).toBe(2);
    expect(headers[0]?.name).toBe("Accept");
    expect(headers[0]?.value).toBe("application/json");
    expect(headers[1]?.name).toBe("X-Request-ID");
    expect(headers[1]?.value).toBe("abc-123");
  });

  it("parses multiline body (data: |)", () => {
    const yaml = `
info:
  name: Create
  type: http
http:
  method: POST
  url: https://api.example.com/users
  body:
    type: json
    data: |
      {"name":"Test","email":"test@example.com"}
`;
    const doc = parseFirstDocument(yaml);
    expect(doc).toBeDefined();
    const http = doc?.http as Record<string, unknown>;
    const body = http?.body as Record<string, unknown>;
    expect(body?.type).toBe("json");
    expect((body?.data as string)?.trim()).toBe(
      '{"name":"Test","email":"test@example.com"}',
    );
  });

  it("parses auth block", () => {
    const yaml = `
info:
  name: Auth
  type: http
http:
  method: GET
  url: https://api.example.com/me
  auth:
    type: bearer
    token: "{{token}}"
`;
    const doc = parseFirstDocument(yaml);
    expect(doc).toBeDefined();
    const http = doc?.http as Record<string, unknown>;
    const auth = http?.auth as Record<string, unknown>;
    expect(auth?.type).toBe("bearer");
    expect(auth?.token).toBe("{{token}}");
  });
});

describe("parseAllDocuments", () => {
  it("returns single doc for single-doc content", () => {
    const yaml = `
info:
  name: Only
  type: http
http:
  method: GET
  url: https://example.com
`;
    const docs = parseAllDocuments(yaml);
    expect(docs.length).toBe(1);
    const info = (docs[0]?.info as Record<string, unknown>) ?? {};
    expect(info.name).toBe("Only");
  });

  it("returns all documents from multi-doc content", () => {
    const yaml = `
info:
  name: One
  type: http
http:
  method: GET
  url: https://example.com/1
---
info:
  name: Two
  type: http
http:
  method: POST
  url: https://example.com/2
---
info:
  name: Three
  type: http
http:
  method: PUT
  url: https://example.com/3
`;
    const docs = parseAllDocuments(yaml);
    expect(docs.length).toBe(3);
    expect((docs[0]?.info as Record<string, unknown>)?.name).toBe("One");
    expect((docs[1]?.info as Record<string, unknown>)?.name).toBe("Two");
    expect((docs[2]?.info as Record<string, unknown>)?.name).toBe("Three");
    expect((docs[0]?.http as Record<string, unknown>)?.method).toBe("GET");
    expect((docs[1]?.http as Record<string, unknown>)?.method).toBe("POST");
    expect((docs[2]?.http as Record<string, unknown>)?.method).toBe("PUT");
  });

  it("ensures headers is array on each document", () => {
    const yaml = `
info:
  name: No headers
  type: http
http:
  method: GET
  url: https://example.com
`;
    const docs = parseAllDocuments(yaml);
    expect(docs.length).toBe(1);
    const http = docs[0]?.http as Record<string, unknown>;
    expect(Array.isArray(http?.headers)).toBe(true);
    expect((http?.headers as unknown[]).length).toBe(0);
  });
});

describe("example-bruno.yaml fixture", () => {
  it("parses docs/example-bruno.yaml structure", () => {
    const yaml = `
info:
  name: Get User
  type: http
  seq: 1
http:
  method: GET
  url: https://api.example.com/users/1
  headers:
    - name: Accept
      value: application/json
---
info:
  name: Create User
  type: http
  seq: 2
http:
  method: POST
  url: https://api.example.com/users
  headers:
    - name: Content-Type
      value: application/json
  body:
    type: json
    data: |
      {"name":"Test","email":"test@example.com"}
---
info:
  name: Auth required
  type: http
  seq: 3
http:
  method: GET
  url: https://api.example.com/me
  headers:
    - name: Authorization
      value: Bearer {{token}}
  auth:
    type: bearer
    token: "{{token}}"
`;
    const first = parseFirstDocument(yaml);
    expect(first).toBeDefined();
    expect((first?.info as Record<string, unknown>)?.name).toBe("Get User");
    expect((first?.http as Record<string, unknown>)?.method).toBe("GET");

    const all = parseAllDocuments(yaml);
    expect(all.length).toBe(3);
    const create = all[1];
    const createHttp = create?.http as Record<string, unknown>;
    const createBody = createHttp?.body as Record<string, unknown>;
    expect(createBody?.type).toBe("json");
    expect(String(createBody?.data).includes("Test")).toBe(true);
    const authDoc = all[2];
    const authHttp = authDoc?.http as Record<string, unknown>;
    const authAuth = authHttp?.auth as Record<string, unknown>;
    expect(authAuth?.type).toBe("bearer");
    expect(authAuth?.token).toBe("{{token}}");
  });
});
