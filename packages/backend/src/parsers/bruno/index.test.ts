import { describe, expect, it } from "vitest";

import { detectBrunoAuth, parseBrunoOpenCollectionYaml } from "../bruno.js";

const mockSdk = { console: { log: () => {} } } as unknown as Parameters<
  typeof parseBrunoOpenCollectionYaml
>[0];

describe("bruno parser", () => {
  it("parses minimal OpenCollection YAML", async () => {
    const content = `
info:
  name: Get User
  type: http
http:
  method: GET
  url: https://api.example.com/users/1
`;
    const collection = await parseBrunoOpenCollectionYaml(
      mockSdk,
      content,
      "example.yaml",
    );
    expect(collection.name).toBe("Get User");
    expect(collection.requests.length).toBe(1);
    expect(collection.requests[0]?.method).toBe("GET");
    expect(collection.requests[0]?.url).toBe("https://api.example.com/users/1");
  });

  it("detectBrunoAuth returns none when no auth", () => {
    const auth = detectBrunoAuth({
      name: "C",
      requests: [
        {
          id: "1",
          name: "R",
          method: "GET",
          url: "https://x.com",
          headers: {},
        },
      ],
    });
    expect(auth.hasAuth).toBe(false);
    expect(auth.authType).toBe("none");
  });
});
