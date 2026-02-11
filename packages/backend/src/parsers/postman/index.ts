import type { SDK } from "caido:plugin";

import { bodyFromRequest } from "./body.js";
import type { PostmanRequestBody } from "./body.js";
import { headersFromRequest } from "./headers.js";
import { urlFromRequest } from "./url.js";

export type PostmanRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: PostmanRequestBody;
  auth?: {
    type: string;
    bearer?: { token: string };
    apikey?: { key: string; value: string };
    basic?: { username: string; password: string };
  };
};

export type PostmanCollection = {
  name: string;
  description?: string;
  requests: PostmanRequest[];
  auth?: PostmanRequest["auth"];
};

type PostmanItem = {
  id?: string;
  name?: string;
  request?: PostmanRequestRaw;
  item?: PostmanItem[];
};

type PostmanRequestRaw = {
  method?: string;
  url?:
    | string
    | {
        raw?: string;
        protocol?: string;
        host?: string[];
        port?: string;
        path?: string[];
      };
  header?: Array<{ key?: string; value?: string; disabled?: boolean }>;
  body?: {
    mode?: string;
    raw?: string;
    formdata?: Array<{
      key?: string;
      value?: string;
      type?: string;
      disabled?: boolean;
    }>;
  };
  auth?: PostmanRequest["auth"];
};

export async function parsePostmanCollection(
  sdk: SDK,
  content: string,
): Promise<PostmanCollection> {
  try {
    const data = JSON.parse(content) as Record<string, unknown>;
    const info = data.info as Record<string, unknown> | undefined;
    if (info === undefined || typeof info?.name !== "string") {
      throw new Error("Invalid Postman collection: missing info.name");
    }

    const collection: PostmanCollection = {
      name: info.name,
      description:
        typeof info.description === "string" ? info.description : undefined,
      requests: [],
      auth: data.auth as PostmanCollection["auth"],
    };
    collection.requests = await extractPostmanRequests(
      sdk,
      Array.isArray(data.item) ? data.item : [],
    );

    return collection;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Postman collection: ${message}`);
  }
}

async function extractPostmanRequests(
  sdk: SDK,
  items: PostmanItem[],
): Promise<PostmanRequest[]> {
  const requests: PostmanRequest[] = [];

  for (const item of items) {
    if (item.request !== undefined) {
      const request = await parsePostmanRequest(sdk, item);
      if (request !== undefined) {
        requests.push(request);
      }
    } else if (item.item !== undefined) {
      const folderRequests = await extractPostmanRequests(sdk, item.item);
      requests.push(...folderRequests);
    }
  }

  return requests;
}

async function parsePostmanRequest(
  _sdk: SDK,
  item: PostmanItem,
): Promise<PostmanRequest | undefined> {
  try {
    const request = item.request;
    if (request === undefined) return undefined;

    const url = urlFromRequest(request.url);
    const headers = headersFromRequest(request.header);
    const method = (request.method ?? "GET").toUpperCase();

    const parsedRequest: PostmanRequest = {
      id: item.id ?? `${method}_${Date.now()}_${Math.random()}`,
      name: item.name ?? `${method} ${url}`,
      method,
      url,
      headers,
    };

    const body = bodyFromRequest(request.body);
    if (body !== undefined) {
      parsedRequest.body = body;
    }

    if (request.auth !== undefined) {
      parsedRequest.auth = request.auth;
    }

    return parsedRequest;
  } catch {
    return undefined;
  }
}

export function detectPostmanAuth(collection: PostmanCollection): {
  hasAuth: boolean;
  authType: string;
  description: string;
} {
  if (collection.auth !== undefined) {
    return {
      hasAuth: true,
      authType: collection.auth.type ?? "unknown",
      description: `Collection uses ${collection.auth.type} authentication`,
    };
  }

  const authHeaders = ["authorization", "x-api-key", "x-auth-token", "bearer"];
  let foundAuthHeader = false;
  let authType = "header";

  for (const request of collection.requests) {
    for (const [key, value] of Object.entries(request.headers)) {
      if (authHeaders.some((auth) => key.toLowerCase().includes(auth))) {
        foundAuthHeader = true;
        if (
          key.toLowerCase().includes("bearer") ||
          (typeof value === "string" &&
            value.toLowerCase().startsWith("bearer"))
        ) {
          authType = "bearer";
        } else if (key.toLowerCase().includes("api")) {
          authType = "apikey";
        }
      }
    }

    if (request.auth !== undefined) {
      return {
        hasAuth: true,
        authType: request.auth.type ?? "unknown",
        description: `Requests use ${request.auth.type} authentication`,
      };
    }
  }

  if (foundAuthHeader) {
    return {
      hasAuth: true,
      authType,
      description: `Found ${authType} authentication in request headers`,
    };
  }

  return {
    hasAuth: false,
    authType: "none",
    description: "No authentication detected",
  };
}
