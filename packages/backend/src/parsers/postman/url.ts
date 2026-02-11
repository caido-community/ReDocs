type PostmanUrlInput =
  | string
  | {
      raw?: string;
      protocol?: string;
      host?: string[];
      port?: string;
      path?: string[];
    }
  | undefined;

export function urlFromRequest(url: PostmanUrlInput): string {
  if (url === undefined) return "";

  if (typeof url === "string") {
    return url;
  }

  if (url.raw !== undefined && url.raw !== "") {
    return url.raw;
  }

  if (url.protocol !== undefined && url.host !== undefined) {
    let out = `${url.protocol}://${url.host.join(".")}`;
    if (url.port !== undefined && url.port !== "") {
      out += `:${url.port}`;
    }
    if (url.path !== undefined && url.path.length > 0) {
      out += `/${url.path.join("/")}`;
    }
    return out;
  }

  return "";
}
