import type { SDK } from "caido:plugin";

import { authFromInsomniaResource } from "./authentication.js";
import type { InsomniaAuth } from "./authentication.js";
import { parseInsomniaBody } from "./body.js";
import type { InsomniaBody } from "./body.js";
import { parseInsomniaHeaders } from "./headers.js";

export type InsomniaRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: InsomniaBody;
  auth?: InsomniaAuth;
};

type InsomniaCollection = {
  name: string;
  description?: string;
  requests: InsomniaRequest[];
  auth?: { type: string };
};

type InsomniaResource = Record<string, unknown>;

function parseInsomniaRequestResource(
  resource: InsomniaResource,
  index: number,
): InsomniaRequest | undefined {
  const type = resource._type;
  if (typeof type !== "string" || type.toLowerCase() !== "request") {
    return undefined;
  }

  const name =
    typeof resource.name === "string" ? resource.name : `Request ${index + 1}`;
  const method =
    typeof resource.method === "string" ? resource.method.toUpperCase() : "GET";
  const url = typeof resource.url === "string" ? resource.url : "";

  const headers = parseInsomniaHeaders(resource.headers);
  const body = parseInsomniaBody(resource.body);

  const id =
    typeof resource._id === "string"
      ? resource._id
      : `insomnia_${index}_${Date.now()}`;

  const req: InsomniaRequest = {
    id,
    name,
    method,
    url,
    headers,
  };
  if (body !== undefined) req.body = body;

  const auth = resource.authentication ?? resource.auth;
  const parsedAuth = authFromInsomniaResource(auth);
  if (parsedAuth !== undefined) {
    req.auth = parsedAuth;
  }

  return req;
}

function findWorkspaceName(resources: InsomniaResource[]): string {
  const workspace = resources.find(
    (r) =>
      r !== null &&
      typeof r === "object" &&
      typeof (r as Record<string, unknown>)._type === "string" &&
      ((r as Record<string, unknown>)._type as string).toLowerCase() ===
        "workspace",
  ) as Record<string, unknown> | undefined;
  if (workspace !== undefined && typeof workspace.name === "string") {
    return workspace.name;
  }
  return "Insomnia Export";
}

export async function parseInsomniaExport(
  _sdk: SDK,
  content: string,
): Promise<InsomniaCollection> {
  const data = JSON.parse(content) as Record<string, unknown>;
  const resources = data.resources;
  if (!Array.isArray(resources)) {
    throw new Error("Invalid Insomnia export: missing resources array");
  }

  const name = findWorkspaceName(resources as InsomniaResource[]);
  const requests: InsomniaRequest[] = [];

  (resources as InsomniaResource[]).forEach((r, i) => {
    const req = parseInsomniaRequestResource(r, i);
    if (req !== undefined) {
      requests.push(req);
    }
  });

  return {
    name,
    requests,
  };
}

export function detectInsomniaAuth(collection: InsomniaCollection): {
  hasAuth: boolean;
  authType: string;
  description: string;
} {
  if (collection.auth?.type !== undefined) {
    return {
      hasAuth: true,
      authType: collection.auth.type,
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
        description: `Requests use ${request.auth.type ?? "unknown"} authentication`,
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
