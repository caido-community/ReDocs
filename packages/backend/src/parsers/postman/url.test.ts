import { describe, expect, it } from "vitest";

import { urlFromRequest } from "./url.js";

describe("urlFromRequest", () => {
  it("returns empty string for undefined", () => {
    expect(urlFromRequest(undefined)).toBe("");
  });

  it("returns string url as-is", () => {
    expect(urlFromRequest("https://api.example.com/v1/users")).toBe(
      "https://api.example.com/v1/users",
    );
  });

  it("returns raw when present", () => {
    expect(
      urlFromRequest({
        raw: "https://api.example.com/path",
        protocol: "https",
        host: ["api", "example", "com"],
      }),
    ).toBe("https://api.example.com/path");
  });

  it("builds url from protocol and host", () => {
    expect(
      urlFromRequest({
        protocol: "https",
        host: ["api", "example", "com"],
      }),
    ).toBe("https://api.example.com");
  });

  it("includes port when present", () => {
    expect(
      urlFromRequest({
        protocol: "https",
        host: ["localhost"],
        port: "8443",
      }),
    ).toBe("https://localhost:8443");
  });

  it("includes path when present", () => {
    expect(
      urlFromRequest({
        protocol: "https",
        host: ["api", "example", "com"],
        path: ["v1", "users"],
      }),
    ).toBe("https://api.example.com/v1/users");
  });
});
