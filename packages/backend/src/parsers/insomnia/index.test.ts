import { describe, expect, it } from "vitest";

import { detectInsomniaAuth, parseInsomniaExport } from "../insomnia.js";

const mockSdk = { console: { log: () => {} } } as unknown as Parameters<
  typeof parseInsomniaExport
>[0];

describe("insomnia parser", () => {
  it("parses minimal export and returns requests", async () => {
    const content = JSON.stringify({
      resources: [
        { _id: "wrk_1", _type: "Workspace", name: "W" },
        {
          _id: "req_1",
          _type: "Request",
          parentId: "wrk_1",
          name: "Get",
          method: "GET",
          url: "https://api.example.com/users",
        },
      ],
    });
    const collection = await parseInsomniaExport(mockSdk, content);
    expect(collection.name).toBe("W");
    expect(collection.requests.length).toBe(1);
    expect(collection.requests[0]?.method).toBe("GET");
    expect(collection.requests[0]?.url).toBe("https://api.example.com/users");
  });

  it("detectInsomniaAuth returns none when no auth", () => {
    const auth = detectInsomniaAuth({
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
