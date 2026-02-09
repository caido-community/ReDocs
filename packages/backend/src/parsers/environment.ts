import type { SDK } from "caido:plugin";
import type { EnvironmentVariable } from "shared";

export type PostmanEnvironment = {
  name: string;
  description?: string;
  variables: EnvironmentVariable[];
};

const SENSITIVE_KEYWORDS = [
  "token",
  "key",
  "secret",
  "password",
  "auth",
  "authorization",
  "bearer",
  "api_key",
  "apikey",
  "client_secret",
  "access_token",
  "refresh_token",
  "private_key",
  "credential",
  "pass",
  "pwd",
];

function shouldBeSecret(key: string, value: string): boolean {
  const keyLower = key.toLowerCase();

  const keyHasSensitive = SENSITIVE_KEYWORDS.some((keyword) =>
    keyLower.includes(keyword),
  );

  const valueIsToken =
    /^[a-zA-Z0-9_\-.]{20,}$/.test(value) && value.length > 20;

  return keyHasSensitive || valueIsToken;
}

export async function parsePostmanEnvironment(
  sdk: SDK,
  content: string,
): Promise<PostmanEnvironment> {
  try {
    const data = JSON.parse(content);

    if (!data || typeof data !== "object") {
      throw new Error("Invalid environment file: not a valid JSON object");
    }

    if (!data.name || typeof data.name !== "string") {
      throw new Error(
        "Invalid environment file: missing or invalid name field",
      );
    }

    if (!Array.isArray(data.values)) {
      throw new Error(
        "Invalid environment file: missing or invalid values array",
      );
    }

    const variables: EnvironmentVariable[] = data.values
      .filter(
        (item: any) =>
          item &&
          typeof item === "object" &&
          typeof item.key === "string" &&
          typeof item.value === "string",
      )
      .map((item: any) => ({
        key: item.key,
        value: item.value,
        enabled: item.enabled !== false,
        type: item.type || "default",
        isSecret: shouldBeSecret(item.key, item.value),
      }));

    if (variables.length === 0) {
      throw new Error("Invalid environment file: no valid variables found");
    }

    return {
      name: data.name,
      description: data.description || undefined,
      variables,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid environment file: malformed JSON");
    }
    throw error;
  }
}
export function isPostmanEnvironment(
  content: string,
  fileName: string,
): boolean {
  try {
    const data = JSON.parse(content);

    if (!data.name || typeof data.name !== "string") {
      return false;
    }

    if (!data.values || !Array.isArray(data.values)) {
      return false;
    }

    const hasPostmanScope = data._postman_variable_scope === "environment";
    const hasPostmanExport =
      data._postman_exported_at &&
      typeof data._postman_exported_at === "string";
    const hasEnvironmentInName =
      fileName.toLowerCase().includes("environment") ||
      fileName.toLowerCase().includes("env");

    return (hasPostmanScope || hasPostmanExport) && hasEnvironmentInName;
  } catch (error) {
    return false;
  }
}
