import type { SDK } from "caido:plugin";

export type InsomniaRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: {
    mode: string;
    raw?: string;
    formdata?: Array<{ key: string; value: string; type: string }>;
  };
  auth?: {
    type: string;
    bearer?: { token: string };
    apikey?: { key: string; value: string };
    basic?: { username: string; password: string };
  };
};

type InsomniaCollection = {
  name: string;
  description?: string;
  requests: InsomniaRequest[];
  auth?: { type: string };
};

type InsomniaResource = Record<string, unknown>;

function parseInsomniaHeaders(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof headers === "string" && headers.trim() !== "") {
    const lines = headers.split(/\r?\n/);
    for (const line of lines) {
      const colon = line.indexOf(":");
      if (colon > 0) {
        const key = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();
        if (key !== undefined && value !== undefined) {
          out[key] = value;
        }
      }
    }
    return out;
  }
  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (h !== null && typeof h === "object" && "name" in h && "value" in h) {
        const name = String((h as Record<string, unknown>).name ?? "").trim();
        const value = String((h as Record<string, unknown>).value ?? "").trim();
        if (name !== undefined) {
          out[name] = value;
        }
      }
    }
    return out;
  }
  return out;
}

function parseInsomniaBody(body: unknown): InsomniaRequest["body"] | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string" && body.trim() !== "") {
    return { mode: "raw", raw: body };
  }
  if (typeof body === "object" && "text" in body) {
    const b = body as Record<string, unknown>;
    const text = b.text;
    return {
      mode: "raw",
      raw: typeof text === "string" ? text : JSON.stringify(text ?? ""),
    };
  }
  return undefined;
}

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
  let url = typeof resource.url === "string" ? resource.url : "";
  if (url === undefined || url === null) url = "";

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
  if (auth !== undefined && auth !== null && typeof auth === "object") {
    const a = auth as Record<string, unknown>;
    const authType = typeof a.type === "string" ? a.type : "bearer";
    req.auth = { type: authType };
    if (authType === "bearer" && a.token !== undefined) {
      req.auth.bearer = { token: String(a.token) };
    }
    if (authType === "apikey" && a.apiKey !== undefined) {
      const key =
        typeof (a as { key?: string }).key === "string"
          ? (a as { key: string }).key
          : "Authorization";
      req.auth.apikey = { key, value: String(a.apiKey) };
    }
    if (authType === "basic") {
      const username =
        typeof (a as { username?: string }).username === "string"
          ? (a as { username: string }).username
          : "";
      const password =
        typeof (a as { password?: string }).password === "string"
          ? (a as { password: string }).password
          : "";
      req.auth.basic = { username, password };
    }
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
  if (workspace && typeof workspace.name === "string") {
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
