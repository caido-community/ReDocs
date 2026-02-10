import { describe, expect, it } from "vitest";

import { headersFromYaml } from "./headers.js";

describe("headersFromYaml", () => {
  it("returns empty object for undefined", () => {
    expect(headersFromYaml(undefined)).toEqual({});
  });

  it("returns empty object for non-array input", () => {
    expect(headersFromYaml(null)).toEqual({});
    expect(headersFromYaml("string")).toEqual({});
    expect(headersFromYaml({})).toEqual({});
  });

  it("parses array of name/value objects", () => {
    const result = headersFromYaml([
      { name: "Accept", value: "application/json" },
      { name: "X-Request-ID", value: "req-123" },
    ]);
    expect(result).toEqual({
      Accept: "application/json",
      "X-Request-ID": "req-123",
    });
  });

  it("skips entries without name", () => {
    const result = headersFromYaml([
      { name: "A", value: "1" },
      { value: "2" },
      { name: "", value: "3" },
    ]);
    expect(result).toEqual({ A: "1" });
  });

  it("trims name and value", () => {
    const result = headersFromYaml([
      { name: "  Accept  ", value: "  application/json  " },
    ]);
    expect(result).toEqual({ Accept: "application/json" });
  });

  it("returns empty object for empty array", () => {
    expect(headersFromYaml([])).toEqual({});
  });
});
