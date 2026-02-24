import { describe, expect, it } from "vitest";

import { generateExampleFromSchema } from "./generateExampleFromSchema.js";

describe("generateExampleFromSchema", () => {
  it("returns undefined for undefined or null schema", () => {
    expect(generateExampleFromSchema(undefined, {})).toBeUndefined();
    expect(generateExampleFromSchema(null, {})).toBeUndefined();
  });

  it("returns undefined for non-object schema", () => {
    expect(generateExampleFromSchema("string", {})).toBeUndefined();
    expect(generateExampleFromSchema(42, {})).toBeUndefined();
  });

  it("returns example when present", () => {
    const schema = { type: "string", example: "custom" };
    expect(generateExampleFromSchema(schema, {})).toBe("custom");
  });

  it("returns string for type string", () => {
    expect(generateExampleFromSchema({ type: "string" }, {})).toBe("string");
  });

  it("returns email for format email", () => {
    expect(
      generateExampleFromSchema({ type: "string", format: "email" }, {}),
    ).toBe("user@example.com");
  });

  it("returns 0 for type number/integer", () => {
    expect(generateExampleFromSchema({ type: "number" }, {})).toBe(0);
    expect(generateExampleFromSchema({ type: "integer" }, {})).toBe(0);
  });

  it("returns true for type boolean", () => {
    expect(generateExampleFromSchema({ type: "boolean" }, {})).toBe(true);
  });

  it("returns array for type array", () => {
    expect(generateExampleFromSchema({ type: "array" }, {})).toEqual([]);
  });

  it("returns object with properties", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        count: { type: "integer" },
      },
    };
    const result = generateExampleFromSchema(schema, {});
    expect(result).toEqual({ name: "string", count: 0 });
  });

  it("resolves $ref and generates example", () => {
    const spec = {
      components: {
        schemas: {
          User: {
            type: "object",
            properties: { name: { type: "string" } },
          },
        },
      },
    };
    const schema = { $ref: "#/components/schemas/User" };
    const result = generateExampleFromSchema(schema, spec);
    expect(result).toEqual({ name: "string" });
  });
});
