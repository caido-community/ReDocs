export type PostmanRequestBody = {
  mode: string;
  raw?: string;
  formdata?: Array<{ key: string; value: string; type: string }>;
};

type PostmanBodyInput =
  | {
      mode?: string;
      raw?: string;
      formdata?: Array<{
        key?: string;
        value?: string;
        type?: string;
        disabled?: boolean;
      }>;
    }
  | undefined;

export function bodyFromRequest(
  body: PostmanBodyInput,
): PostmanRequestBody | undefined {
  if (body === undefined) return undefined;

  const result: PostmanRequestBody = {
    mode: body.mode ?? "raw",
  };

  if (body.raw !== undefined) {
    result.raw = body.raw;
  }

  if (body.formdata !== undefined && Array.isArray(body.formdata)) {
    result.formdata = body.formdata
      .filter((entry) => entry.disabled !== true)
      .map((entry) => ({
        key: entry.key ?? "",
        value: entry.value ?? "",
        type: entry.type ?? "text",
      }));
  }

  return result;
}
