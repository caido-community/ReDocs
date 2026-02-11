type PostmanHeaderEntry = {
  key?: string;
  value?: string;
  disabled?: boolean;
};

export function headersFromRequest(
  header: PostmanHeaderEntry[] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (header === undefined || !Array.isArray(header)) return out;

  for (const h of header) {
    if (h.key !== undefined && h.value !== undefined && h.disabled !== true) {
      out[h.key] = h.value;
    }
  }
  return out;
}
