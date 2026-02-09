import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

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
    assert.ok(doc !== undefined);
    const info = doc?.info as Record<string, unknown>;
    const http = doc?.http as Record<string, unknown>;
    assert.strictEqual(info?.name, "Get User");
    assert.strictEqual(info?.type, "http");
    assert.strictEqual(http?.method, "GET");
    assert.strictEqual(http?.url, "https://api.example.com/users/1");
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
    assert.ok(doc !== undefined);
    const info = doc?.info as Record<string, unknown>;
    assert.strictEqual(info?.name, "First");
    const http = doc?.http as Record<string, unknown>;
    assert.strictEqual(http?.method, "GET");
  });

  it("returns undefined for empty or whitespace-only content", () => {
    assert.strictEqual(parseFirstDocument(""), undefined);
    assert.strictEqual(parseFirstDocument("   \n  "), undefined);
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
    assert.ok(doc !== undefined);
    const http = doc?.http as Record<string, unknown>;
    const headers = http?.headers as Array<{ name?: string; value?: string }>;
    assert.ok(Array.isArray(headers));
    assert.strictEqual(headers.length, 2);
    assert.strictEqual(headers[0]?.name, "Accept");
    assert.strictEqual(headers[0]?.value, "application/json");
    assert.strictEqual(headers[1]?.name, "X-Request-ID");
    assert.strictEqual(headers[1]?.value, "abc-123");
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
    assert.ok(doc !== undefined);
    const http = doc?.http as Record<string, unknown>;
    const body = http?.body as Record<string, unknown>;
    assert.strictEqual(body?.type, "json");
    assert.strictEqual(
      (body?.data as string)?.trim(),
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
    assert.ok(doc !== undefined);
    const http = doc?.http as Record<string, unknown>;
    const auth = http?.auth as Record<string, unknown>;
    assert.strictEqual(auth?.type, "bearer");
    assert.strictEqual(auth?.token, "{{token}}");
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
    assert.strictEqual(docs.length, 1);
    const info = (docs[0]?.info as Record<string, unknown>) ?? {};
    assert.strictEqual(info.name, "Only");
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
    assert.strictEqual(docs.length, 3);
    assert.strictEqual((docs[0]?.info as Record<string, unknown>)?.name, "One");
    assert.strictEqual((docs[1]?.info as Record<string, unknown>)?.name, "Two");
    assert.strictEqual(
      (docs[2]?.info as Record<string, unknown>)?.name,
      "Three",
    );
    assert.strictEqual(
      (docs[0]?.http as Record<string, unknown>)?.method,
      "GET",
    );
    assert.strictEqual(
      (docs[1]?.http as Record<string, unknown>)?.method,
      "POST",
    );
    assert.strictEqual(
      (docs[2]?.http as Record<string, unknown>)?.method,
      "PUT",
    );
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
    assert.strictEqual(docs.length, 1);
    const http = docs[0]?.http as Record<string, unknown>;
    assert.ok(Array.isArray(http?.headers));
    assert.strictEqual((http?.headers as unknown[]).length, 0);
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
    assert.ok(first !== undefined);
    assert.strictEqual(
      (first?.info as Record<string, unknown>)?.name,
      "Get User",
    );
    assert.strictEqual((first?.http as Record<string, unknown>)?.method, "GET");

    const all = parseAllDocuments(yaml);
    assert.strictEqual(all.length, 3);
    const create = all[1];
    const createHttp = create?.http as Record<string, unknown>;
    const createBody = createHttp?.body as Record<string, unknown>;
    assert.strictEqual(createBody?.type, "json");
    assert.ok(
      String(createBody?.data).includes("Test"),
      "multiline body should be parsed",
    );
    const authDoc = all[2];
    const authHttp = authDoc?.http as Record<string, unknown>;
    const authAuth = authHttp?.auth as Record<string, unknown>;
    assert.strictEqual(authAuth?.type, "bearer");
    assert.strictEqual(authAuth?.token, "{{token}}");
  });
});
