import type { SDK } from "caido:plugin";
import type { AuthConfig } from "shared";

import type { BrunoRequest } from "../parsers/bruno.js";
import type { InsomniaRequest } from "../parsers/insomnia.js";
import type { OpenAPIRequest } from "../parsers/openapi.js";
import type { PostmanRequest } from "../parsers/postman.js";

type CollectionRequest =
  | PostmanRequest
  | OpenAPIRequest
  | InsomniaRequest
  | BrunoRequest;

function parseUrl(urlString: string):
  | {
      protocol: string;
      hostname: string;
      port?: string;
      pathname: string;
      search?: string;
    }
  | undefined {
  try {
    const urlRegex =
      /^(https?):\/\/([^:/\s]+(?::\d+)?)(?:\/([^\s?]*))?(\?[^\s]*)?/;
    const match = urlString.match(urlRegex);

    if (!match || !match[1] || !match[2]) return undefined;

    const hostPart = match[2];
    const portMatch = hostPart.includes(":")
      ? hostPart.split(":")
      : [hostPart, undefined];
    const hostname = portMatch[0] ?? hostPart;
    const port = portMatch[1];

    const pathPart = match[3];
    const pathname =
      pathPart !== undefined && pathPart !== "" ? "/" + pathPart : "/";
    const search = match[4] ?? undefined;

    return {
      protocol: match[1] + ":",
      hostname,
      port,
      pathname,
      search,
    };
  } catch {
    return undefined;
  }
}

function btoaBase64(str: string): string {
  try {
    const g = globalThis as { btoa?: (s: string) => string };
    if (typeof g.btoa === "function") {
      return g.btoa(str);
    }
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      const bitmap = (a << 16) | (b << 8) | c;
      result +=
        chars.charAt((bitmap >> 18) & 63) +
        chars.charAt((bitmap >> 12) & 63) +
        (i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : "=") +
        (i - 1 < str.length ? chars.charAt(bitmap & 63) : "=");
    }
    return result;
  } catch {
    return "";
  }
}

export async function createReplaySessions(
  sdk: SDK,
  requests: CollectionRequest[],
  collectionName: string,
  authConfig: AuthConfig,
): Promise<{
  success: boolean;
  processedRequests: Array<{
    request: CollectionRequest;
    spec: RequestSpecData;
    sessionName: string;
  }>;
  collectionName: string;
  message: string;
}> {
  try {
    const processedRequests: Array<{
      request: CollectionRequest;
      spec: RequestSpecData;
      sessionName: string;
    }> = [];

    for (let i = 0; i < requests.length; i++) {
      try {
        const request = requests[i];

        if (!request) {
          continue;
        }

        const processedRequest = applyAuthentication(request, authConfig);
        const spec = await buildRequestSpec(
          processedRequest,
          authConfig.hostname,
        );
        const sessionName = generateCompleteSessionName(processedRequest);

        if (spec) {
          processedRequests.push({
            request: processedRequest,
            spec,
            sessionName,
          });
        }
      } catch {
        void 0;
      }
    }

    return {
      success: true,
      processedRequests,
      collectionName,
      message: `Processed ${processedRequests.length} requests for session creation`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      processedRequests: [],
      collectionName,
      message: `Failed to process requests: ${message}`,
    };
  }
}

type RequestSpecData = {
  method: string;
  host: string;
  port: number;
  path: string;
  query: string;
  headers: Record<string, string>;
  body: string;
  tls: boolean;
  url: string;
};

async function buildRequestSpec(
  request: CollectionRequest,
  hostname?: string,
): Promise<RequestSpecData | undefined> {
  try {
    let targetUrl = request.url;

    if (hostname && hostname.trim()) {
      if (targetUrl.includes("{{") && targetUrl.includes("}}")) {
        targetUrl = targetUrl.replace(/\{\{[^}]+\}\}/g, hostname.trim());
      } else if (targetUrl.startsWith("/")) {
        targetUrl = `https://${hostname.trim()}${targetUrl}`;
      } else {
        try {
          const urlObj = parseUrl(
            targetUrl.startsWith("http") ? targetUrl : "https://" + targetUrl,
          );
          if (urlObj) {
            targetUrl = `${urlObj.protocol}//${hostname.trim()}${urlObj.pathname}${urlObj.search || ""}`;
          }
        } catch {
          const path = targetUrl.startsWith("/") ? targetUrl : "/" + targetUrl;
          targetUrl = `https://${hostname.trim()}${path}`;
        }
      }
    } else if (targetUrl.includes("{{") && targetUrl.includes("}}")) {
      if (targetUrl.startsWith("/")) {
        targetUrl = `https://example.com${targetUrl}`;
      } else {
        targetUrl = targetUrl.replace(/\{\{[^}]+\}\}/g, "example.com");
      }
    } else if (targetUrl.startsWith("/")) {
      targetUrl = `https://example.com${targetUrl}`;
    }

    if (!targetUrl.startsWith("http")) {
      targetUrl = "https://" + targetUrl;
    }

    const urlObj = parseUrl(targetUrl);
    if (!urlObj) {
      return undefined;
    }

    const finalHeaders = { ...request.headers };
    let finalBody = "";
    if ("body" in request && request.body) {
      if ("raw" in request.body && request.body.raw) {
        finalBody = request.body.raw;
      } else if ("formdata" in request.body && request.body.formdata) {
        const formPairs = request.body.formdata.map(
          (item) =>
            `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value || "")}`,
        );
        finalBody = formPairs.join("&");
        finalHeaders["Content-Type"] = "application/x-www-form-urlencoded";
      } else if ("example" in request.body && request.body.example) {
        if (request.body.contentType === "application/json") {
          finalBody = JSON.stringify(request.body.example, null, 2);
        } else if (
          request.body.contentType === "application/x-www-form-urlencoded"
        ) {
          if (
            typeof request.body.example === "object" &&
            request.body.example !== null
          ) {
            const formPairs = Object.entries(request.body.example).map(
              ([key, value]) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
            );
            finalBody = formPairs.join("&");
          }
        } else {
          finalBody =
            typeof request.body.example === "string"
              ? request.body.example
              : JSON.stringify(request.body.example);
        }
        if (request.body.contentType) {
          finalHeaders["Content-Type"] = request.body.contentType;
        }
      }
    }
    return {
      method: request.method,
      host: urlObj.hostname,
      port: urlObj.port
        ? parseInt(urlObj.port)
        : urlObj.protocol === "https:"
          ? 443
          : 80,
      path: urlObj.pathname || "/",
      query: urlObj.search || "",
      headers: finalHeaders,
      body: finalBody,
      tls: urlObj.protocol === "https:",
      url: targetUrl,
    };
  } catch {
    return undefined;
  }
}

function generateCompleteSessionName(request: CollectionRequest): string {
  try {
    let fullPath = request.url;

    if (fullPath.includes("://")) {
      const urlParts = fullPath.split("://");
      if (urlParts.length > 1 && urlParts[1]) {
        const afterProtocol = urlParts[1];
        const firstSlash = afterProtocol.indexOf("/");
        if (firstSlash !== -1) {
          fullPath = afterProtocol.substring(firstSlash);
        } else {
          fullPath = "/";
        }
      }
    } else if (fullPath.includes("}}")) {
      const templateEnd = fullPath.lastIndexOf("}}");
      if (templateEnd !== -1) {
        let pathAfterTemplate = fullPath.substring(templateEnd + 2);
        if (!pathAfterTemplate.startsWith("/")) {
          pathAfterTemplate = "/" + pathAfterTemplate;
        }
        fullPath = pathAfterTemplate;
      }
    } else if (!fullPath.startsWith("/")) {
      fullPath = "/" + fullPath;
    }

    if (fullPath.includes("?")) {
      const pathPart = fullPath.split("?")[0];
      if (pathPart) {
        fullPath = pathPart;
      }
    }

    if (fullPath.includes("#")) {
      const pathPart = fullPath.split("#")[0];
      if (pathPart) {
        fullPath = pathPart;
      }
    }

    fullPath = fullPath.replace(/\/+/g, "/");

    if (!fullPath.startsWith("/")) {
      fullPath = "/" + fullPath;
    }

    if (fullPath === "/" && request.url !== "/") {
      fullPath = request.url.replace(/^https?:\/\/[^/]+/, "") || "/";
    }

    return `${request.method.toUpperCase()} ${fullPath}`;
  } catch (error: any) {
    return `${request.method.toUpperCase()} ${request.url}`;
  }
}

function applyAuthentication(
  request: CollectionRequest,
  authConfig: AuthConfig,
): CollectionRequest {
  const processedRequest = { ...request, headers: { ...request.headers } };

  switch (authConfig.type) {
    case "none":
      break;

    case "apikey":
      if (authConfig.key && authConfig.value) {
        delete processedRequest.headers["Authorization"];
        delete processedRequest.headers["authorization"];
        processedRequest.headers[authConfig.key] = authConfig.value;
      }
      break;

    case "bearer":
      if (authConfig.token) {
        delete processedRequest.headers["X-API-Key"];
        delete processedRequest.headers["x-api-key"];
        delete processedRequest.headers["X-Auth-Token"];
        delete processedRequest.headers["x-auth-token"];
        processedRequest.headers["Authorization"] =
          `Bearer ${authConfig.token}`;
      }
      break;

    case "basic":
      if (authConfig.username && authConfig.password) {
        delete processedRequest.headers["X-API-Key"];
        delete processedRequest.headers["x-api-key"];
        delete processedRequest.headers["X-Auth-Token"];
        delete processedRequest.headers["x-auth-token"];
        const credentials = btoaBase64(
          `${authConfig.username}:${authConfig.password}`,
        );
        processedRequest.headers["Authorization"] = `Basic ${credentials}`;
      }
      break;

    case "custom":
      if (authConfig.header && authConfig.value) {
        if (authConfig.header.toLowerCase() === "authorization") {
          delete processedRequest.headers["X-API-Key"];
          delete processedRequest.headers["x-api-key"];
        }
        processedRequest.headers[authConfig.header] = authConfig.value;
      }
      break;

    default:
      break;
  }

  return processedRequest;
}
