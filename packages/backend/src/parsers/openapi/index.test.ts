import { describe, expect, it } from "vitest";

import { detectOpenAPIAuth, parseOpenAPISpec } from "../openapi.js";

const mockSdk = { console: { log: () => {} } } as unknown as Parameters<
  typeof parseOpenAPISpec
>[0];

describe("openapi parser", () => {
  it("parses minimal OpenAPI 3 spec and returns requests", async () => {
    const content = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "API", version: "1.0" },
      servers: [{ url: "https://api.example.com" }],
      paths: {
        "/users": {
          get: {
            summary: "List users",
            responses: { "200": { description: "OK" } },
          },
        },
      },
    });
    const spec = await parseOpenAPISpec(mockSdk, content, false);
    expect(spec.name).toBe("API");
    expect(spec.baseUrl).toBe("https://api.example.com");
    expect(spec.requests.length).toBe(1);
    expect(spec.requests[0]?.method).toBe("GET");
    expect(spec.requests[0]?.url).toContain("/users");
  });

  it("detectOpenAPIAuth returns none when no security", () => {
    const auth = detectOpenAPIAuth({
      name: "API",
      version: "1.0",
      baseUrl: "https://x.com",
      requests: [],
    });
    expect(auth.hasAuth).toBe(false);
    expect(auth.authType).toBe("none");
  });
});
