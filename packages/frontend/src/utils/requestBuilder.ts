import type { RequestSpec } from "../types/index.js";

export const buildRawRequest = (spec: RequestSpec): string => {
  try {
    const method = spec.method || "GET";
    const host = spec.host || "example.com";
    const port = spec.port || (spec.tls ? 443 : 80);
    const path = spec.path || "/";
    const query = spec.query || "";
    const headers = spec.headers || {};
    const body = spec.body || "";
    const isTls = spec.tls !== false;

    const fullPath = path + query;
    let request = `${method} ${fullPath} HTTP/1.1\r\n`;

    if ((isTls && port !== 443) || (!isTls && port !== 80)) {
      request += `Host: ${host}:${port}\r\n`;
    } else {
      request += `Host: ${host}\r\n`;
    }

    for (const [name, value] of Object.entries(headers)) {
      if (name && value && name.toLowerCase() !== "host") {
        request += `${name}: ${value}\r\n`;
      }
    }

    if (body && typeof body === "string" && body.length > 0) {
      request += `Content-Length: ${body.length}\r\n`;
    }

    request += "\r\n";

    if (body && typeof body === "string" && body.length > 0) {
      request += body;
    }

    return request;
  } catch (error) {
    console.error("Error building raw request:", error);
    const method = spec?.method || "GET";
    const path = spec?.path || "/";
    const host = spec?.host || "example.com";
    return `${method} ${path} HTTP/1.1\r\nHost: ${host}\r\n\r\n`;
  }
};
