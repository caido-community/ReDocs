import type { SDK } from "caido:plugin";

import { parseAllDocuments } from "../../utils/minimalYaml.js";

import { authFromYaml } from "./authentication.js";
import type { BrunoAuth } from "./authentication.js";
import { bodyFromYaml } from "./body.js";
import type { BrunoBody } from "./body.js";
import { headersFromYaml } from "./headers.js";

export type BrunoRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: BrunoBody;
  auth?: BrunoAuth;
};

type BrunoCollection = {
  name: string;
  description?: string;
  requests: BrunoRequest[];
};

type OpenCollectionDoc = {
  info?: { name?: string; type?: string };
  http?: {
    method?: string;
    url?: string;
    headers?: Array<{ name?: string; value?: string }>;
    body?: { type?: string; data?: string };
    auth?: {
      type?: string;
      token?: string;
      key?: string;
      username?: string;
      password?: string;
    };
  };
};

function docToRequest(
  doc: OpenCollectionDoc,
  index: number,
): BrunoRequest | undefined {
  const info = doc.info;
  const http = doc.http;
  if (
    info === undefined ||
    http === undefined ||
    (info as Record<string, unknown>).type !== "http" ||
    typeof (http as Record<string, unknown>).method !== "string" ||
    typeof (http as Record<string, unknown>).url !== "string"
  )
    return undefined;

  const name: string =
    typeof (info as Record<string, unknown>).name === "string"
      ? ((info as Record<string, unknown>).name as string)
      : `Request ${index + 1}`;
  const method = (http as Record<string, unknown>).method as string;
  const url = (http as Record<string, unknown>).url as string;

  const headers = headersFromYaml((http as Record<string, unknown>).headers);
  const body = bodyFromYaml((http as Record<string, unknown>).body);
  const auth = authFromYaml((http as Record<string, unknown>).auth);

  const req: BrunoRequest = {
    id: `bruno_${index}_${Date.now()}`,
    name,
    method: method.toUpperCase(),
    url,
    headers,
  };
  if (body !== undefined) req.body = body;
  if (auth !== undefined) req.auth = auth;
  return req;
}

export async function parseBrunoOpenCollectionYaml(
  _sdk: SDK,
  content: string,
  fileName: string,
): Promise<BrunoCollection> {
  const docs = parseAllDocuments(content);
  const requests: BrunoRequest[] = [];
  let collectionName = "Bruno Collection";

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i] as OpenCollectionDoc | undefined;
    if (doc === undefined) continue;
    const req = docToRequest(doc, i);
    if (req !== undefined) {
      requests.push(req);
      if (
        collectionName === "Bruno Collection" &&
        doc.info !== undefined &&
        typeof (doc.info as Record<string, unknown>).name === "string"
      ) {
        collectionName = (doc.info as Record<string, unknown>).name as string;
      }
    }
  }

  if (collectionName === "Bruno Collection" && fileName !== undefined) {
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot > 0) {
      collectionName = fileName.slice(0, lastDot);
    }
  }

  return { name: collectionName, requests };
}

export function detectBrunoAuth(collection: BrunoCollection): {
  hasAuth: boolean;
  authType: string;
  description: string;
} {
  const authHeaders = ["authorization", "x-api-key", "bearer"];
  let foundAuthHeader = false;
  let authType = "header";

  for (const request of collection.requests) {
    for (const [key] of Object.entries(request.headers)) {
      if (authHeaders.some((auth) => key.toLowerCase().includes(auth))) {
        foundAuthHeader = true;
        if (key.toLowerCase().includes("bearer")) authType = "bearer";
        else if (key.toLowerCase().includes("api")) authType = "apikey";
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
