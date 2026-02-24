export type InsomniaAuth = {
  type: string;
  bearer?: { token: string };
  apikey?: { key: string; value: string };
  basic?: { username: string; password: string };
};

export function authFromInsomniaResource(
  auth: unknown,
): InsomniaAuth | undefined {
  if (auth === undefined || auth === null || typeof auth !== "object")
    return undefined;
  const a = auth as Record<string, unknown>;
  const authType = typeof a.type === "string" ? a.type : "bearer";
  const result: InsomniaAuth = { type: authType };
  if (authType === "bearer" && a.token !== undefined) {
    result.bearer = { token: String(a.token) };
  }
  if (authType === "apikey" && a.apiKey !== undefined) {
    const key =
      typeof (a as { key?: string }).key === "string"
        ? (a as { key: string }).key
        : "Authorization";
    result.apikey = { key, value: String(a.apiKey) };
  }
  if (authType === "basic") {
    result.basic = {
      username:
        typeof (a as { username?: string }).username === "string"
          ? (a as { username: string }).username
          : "",
      password:
        typeof (a as { password?: string }).password === "string"
          ? (a as { password: string }).password
          : "",
    };
  }
  return result;
}
