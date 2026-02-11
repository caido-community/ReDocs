import { describe, expect, it } from "vitest";

import { headersFromRequest } from "./headers.js";

describe("headersFromRequest", () => {
  it("returns empty object for undefined", () => {
    expect(headersFromRequest(undefined)).toEqual({});
  });

  it("returns empty object for non-array", () => {
    expect(headersFromRequest(null as unknown as undefined)).toEqual({});
  });

  it("parses key/value pairs", () => {
    const result = headersFromRequest([
      { key: "Accept", value: "application/json" },
      { key: "X-Request-ID", value: "req-123" },
    ]);
    expect(result).toEqual({
      Accept: "application/json",
      "X-Request-ID": "req-123",
    });
  });

  it("skips disabled entries", () => {
    const result = headersFromRequest([
      { key: "A", value: "1" },
      { key: "B", value: "2", disabled: true },
    ]);
    expect(result).toEqual({ A: "1" });
  });

  it("skips entries without key or value", () => {
    const result = headersFromRequest([
      { key: "A", value: "1" },
      { value: "2" },
      { key: "C" },
    ]);
    expect(result).toEqual({ A: "1" });
  });
});
