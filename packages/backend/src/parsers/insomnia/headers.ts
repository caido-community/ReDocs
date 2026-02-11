export function parseInsomniaHeaders(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof headers === "string" && headers.trim() !== "") {
    const lines = headers.split(/\r?\n/);
    for (const line of lines) {
      const colon = line.indexOf(":");
      if (colon > 0) {
        const key = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();
        if (key !== "" && value !== "") {
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
        if (name !== "") {
          out[name] = value;
        }
      }
    }
    return out;
  }
  return out;
}
