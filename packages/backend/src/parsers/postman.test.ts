import { describe, expect, it } from "vitest";

import { detectPostmanAuth, parsePostmanCollection } from "./postman.js";

const mockSdk = { console: { log: () => {} } } as unknown as Parameters<
  typeof parsePostmanCollection
>[0];

describe("postman parser", () => {
  it("parses minimal collection and returns requests", async () => {
    const content = JSON.stringify({
      info: {
        name: "Test",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "Get",
          request: {
            method: "GET",
            url: "https://api.example.com/users",
            header: [],
          },
        },
      ],
    });
    const collection = await parsePostmanCollection(mockSdk, content);
    expect(collection.name).toBe("Test");
    expect(collection.requests.length).toBe(1);
    expect(collection.requests[0]?.method).toBe("GET");
    expect(collection.requests[0]?.url).toBe("https://api.example.com/users");
  });

  it("detectPostmanAuth returns none when no auth", () => {
    const auth = detectPostmanAuth({
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
