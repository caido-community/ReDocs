import { describe, expect, it } from "vitest";

import { isPostmanEnvironment } from "./environment.js";

describe("environment parser", () => {
  it("isPostmanEnvironment returns true for valid env JSON", () => {
    const content = JSON.stringify({
      name: "Dev",
      _postman_variable_scope: "environment",
      values: [
        { key: "baseUrl", value: "https://api.example.com", enabled: true },
      ],
    });
    expect(isPostmanEnvironment(content, "environment.json")).toBe(true);
  });

  it("isPostmanEnvironment returns false for non-object JSON", () => {
    expect(isPostmanEnvironment("[]", "file.json")).toBe(false);
    expect(isPostmanEnvironment("null", "file.json")).toBe(false);
  });
});
