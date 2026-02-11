export type InsomniaBody = {
  mode: string;
  raw?: string;
  formdata?: Array<{ key: string; value: string; type: string }>;
};

export function parseInsomniaBody(body: unknown): InsomniaBody | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string" && body.trim() !== "") {
    return { mode: "raw", raw: body };
  }
  if (typeof body === "object" && body !== null && "text" in body) {
    const b = body as Record<string, unknown>;
    const text = b.text;
    return {
      mode: "raw",
      raw: typeof text === "string" ? text : JSON.stringify(text ?? ""),
    };
  }
  return undefined;
}
