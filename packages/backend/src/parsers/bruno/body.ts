export type BrunoBody = {
  mode: string;
  raw?: string;
  formdata?: Array<{ key: string; value: string; type: string }>;
};

export function bodyFromYaml(body: unknown): BrunoBody | undefined {
  if (body === undefined || body === null || typeof body !== "object")
    return undefined;
  const b = body as Record<string, unknown>;
  const data = b.data;
  if (data === undefined) return undefined;
  const raw = typeof data === "string" ? data : JSON.stringify(data);
  return { mode: "raw", raw };
}
