import { describe, expect, it } from "vitest";

import { bodyFromRequest } from "./body.js";

describe("bodyFromRequest", () => {
  it("returns undefined for undefined", () => {
    expect(bodyFromRequest(undefined)).toBeUndefined();
  });

  it("returns mode raw by default", () => {
    const result = bodyFromRequest({ raw: "{}" });
    expect(result?.mode).toBe("raw");
    expect(result?.raw).toBe("{}");
  });

  it("parses raw body", () => {
    const raw = '{"name":"Test"}';
    const result = bodyFromRequest({ mode: "raw", raw });
    expect(result).toEqual({ mode: "raw", raw });
  });

  it("parses formdata", () => {
    const result = bodyFromRequest({
      mode: "formdata",
      formdata: [
        { key: "subject", value: "Hello", type: "text" },
        { key: "file", value: "content", type: "file" },
      ],
    });
    const expected = [
      { key: "subject", value: "Hello", type: "text" },
      { key: "file", value: "content", type: "file" },
    ];
    expect(result?.formdata).toEqual(expected);
  });

  it("filters disabled formdata entries", () => {
    const result = bodyFromRequest({
      mode: "formdata",
      formdata: [
        { key: "a", value: "1" },
        { key: "b", value: "2", disabled: true },
      ],
    });
    expect(result?.formdata).toEqual([{ key: "a", value: "1", type: "text" }]);
  });

  it("defaults formdata entry type to text", () => {
    const result = bodyFromRequest({
      formdata: [{ key: "x", value: "y" }],
    });
    expect(result?.formdata?.[0]).toEqual({
      key: "x",
      value: "y",
      type: "text",
    });
  });
});
