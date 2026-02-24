export type BrunoAuth = {
  type: string;
  bearer?: { token: string };
  apikey?: { key: string; value: string };
  basic?: { username: string; password: string };
};

export function authFromYaml(auth: unknown): BrunoAuth | undefined {
  if (auth === undefined || auth === null || typeof auth !== "object")
    return undefined;
  const a = auth as Record<string, unknown>;
  const authType = typeof a.type === "string" ? a.type : "bearer";
  const result: BrunoAuth = { type: authType };
  if (authType === "bearer" && a.token !== undefined) {
    result.bearer = { token: String(a.token) };
  }
  if (authType === "apikey" && a.key !== undefined) {
    result.apikey = { key: "Authorization", value: String(a.key) };
  }
  if (authType === "basic") {
    result.basic = {
      username: typeof a.username === "string" ? a.username : "",
      password: typeof a.password === "string" ? a.password : "",
    };
  }
  return result;
}
