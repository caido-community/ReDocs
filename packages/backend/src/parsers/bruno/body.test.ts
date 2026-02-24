import { describe, expect, it } from "vitest";

import { bodyFromYaml } from "./body.js";

describe("bodyFromYaml", () => {
  it("returns undefined for undefined", () => {
    expect(bodyFromYaml(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(bodyFromYaml(null)).toBeUndefined();
  });

  it("returns undefined for non-object input", () => {
    expect(bodyFromYaml("string")).toBeUndefined();
    expect(bodyFromYaml(42)).toBeUndefined();
  });

  it("returns undefined when data is missing", () => {
    expect(bodyFromYaml({ type: "json" })).toBeUndefined();
  });

  it("parses body with string data", () => {
    const raw = '{"name":"Test","email":"test@example.com"}';
    const result = bodyFromYaml({ type: "json", data: raw });
    expect(result).toEqual({ mode: "raw", raw });
  });

  it("stringifies object data", () => {
    const result = bodyFromYaml({
      type: "json",
      data: { name: "Test", count: 1 },
    });
    expect(result?.raw).toBe('{"name":"Test","count":1}');
    expect(result?.mode).toBe("raw");
  });
});
