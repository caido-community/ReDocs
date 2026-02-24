import { describe, expect, it } from "vitest";

import { authFromYaml } from "./authentication.js";

describe("authFromYaml", () => {
  it("returns undefined for undefined", () => {
    expect(authFromYaml(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(authFromYaml(null)).toBeUndefined();
  });

  it("returns undefined for non-object input", () => {
    expect(authFromYaml("string")).toBeUndefined();
    expect(authFromYaml(42)).toBeUndefined();
    expect(authFromYaml(true)).toBeUndefined();
  });

  it("parses bearer auth with token", () => {
    const result = authFromYaml({ type: "bearer", token: "jwt.here" });
    expect(result).toEqual({
      type: "bearer",
      bearer: { token: "jwt.here" },
    });
  });

  it("defaults to bearer when type is missing", () => {
    const result = authFromYaml({ token: "secret" });
    expect(result).toEqual({
      type: "bearer",
      bearer: { token: "secret" },
    });
  });

  it("parses apikey auth with key", () => {
    const result = authFromYaml({ type: "apikey", key: "sk_live_xxx" });
    expect(result).toEqual({
      type: "apikey",
      apikey: { key: "Authorization", value: "sk_live_xxx" },
    });
  });

  it("parses basic auth with username and password", () => {
    const result = authFromYaml({
      type: "basic",
      username: "api_user",
      password: "api_secret",
    });
    expect(result).toEqual({
      type: "basic",
      basic: {
        username: "api_user",
        password: "api_secret",
      },
    });
  });

  it("returns empty strings for basic auth when username/password missing", () => {
    const result = authFromYaml({ type: "basic" });
    expect(result).toEqual({
      type: "basic",
      basic: { username: "", password: "" },
    });
  });

  it("coerces non-string token to string", () => {
    const result = authFromYaml({ type: "bearer", token: 12345 });
    expect(result?.bearer?.token).toBe("12345");
  });
});
