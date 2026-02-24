import { describe, expect, it } from "vitest";

import { resolveSchemaRef } from "./resolveSchemaRef.js";

describe("resolveSchemaRef", () => {
  it("returns undefined for ref not starting with #/", () => {
    const spec = { components: { schemas: { User: { type: "object" } } } };
    expect(resolveSchemaRef("http://example.com/schema", spec)).toBeUndefined();
    expect(resolveSchemaRef("User", spec)).toBeUndefined();
  });

  it("resolves #/components/schemas/User", () => {
    const spec = {
      components: { schemas: { User: { type: "object", properties: {} } } },
    };
    const result = resolveSchemaRef("#/components/schemas/User", spec);
    expect(result).toEqual({ type: "object", properties: {} });
  });

  it("returns undefined for missing path segment", () => {
    const spec = { components: {} };
    expect(
      resolveSchemaRef("#/components/schemas/Missing", spec),
    ).toBeUndefined();
  });

  it("follows $ref to another schema", () => {
    const spec = {
      components: {
        schemas: {
          Id: { type: "string" },
          User: { $ref: "#/components/schemas/Id" },
        },
      },
    };
    const result = resolveSchemaRef("#/components/schemas/User", spec);
    expect(result).toEqual({ type: "string" });
  });

  it("returns circular description for circular ref", () => {
    const spec = {
      components: {
        schemas: {
          Self: { $ref: "#/components/schemas/Self" },
        },
      },
    };
    const result = resolveSchemaRef("#/components/schemas/Self", spec);
    expect(result).toEqual({
      type: "object",
      description: "Circular reference to #/components/schemas/Self",
    });
  });
});
