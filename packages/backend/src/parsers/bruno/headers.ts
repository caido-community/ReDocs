export function headersFromYaml(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(headers)) return out;
  for (const h of headers) {
    if (h !== null && typeof h === "object" && "name" in h) {
      const name = String((h as Record<string, unknown>).name ?? "").trim();
      const value = String((h as Record<string, unknown>).value ?? "").trim();
      if (name !== "") out[name] = value;
    }
  }
  return out;
}
