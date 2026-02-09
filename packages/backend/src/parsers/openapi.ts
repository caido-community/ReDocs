import type { SDK } from "caido:plugin";

export interface OpenAPIRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: {
    contentType: string;
    schema?: unknown;
    example?: unknown;
  };
  parameters: Array<{
    name: string;
    in: "query" | "header" | "path" | "cookie";
    required: boolean;
    schema: unknown;
    example?: unknown;
  }>;
}

export interface OpenAPISpec {
  name: string;
  description?: string;
  version: string;
  baseUrl: string;
  requests: OpenAPIRequest[];
  securitySchemes?: Record<string, unknown>;
}

export async function parseOpenAPISpec(
  sdk: SDK,
  content: string,
  isYaml: boolean = false,
): Promise<OpenAPISpec> {
  try {
    let data: Record<string, unknown>;

    if (isYaml) {
      throw new Error(
        "YAML format is not currently supported. Please convert your OpenAPI specification to JSON format and try again.",
      );
    } else {
      data = JSON.parse(content) as Record<string, unknown>;
    }

    if (!data.openapi && !data.swagger) {
      throw new Error(
        "Invalid OpenAPI specification: missing openapi/swagger version",
      );
    }

    const info = data.info as Record<string, unknown> | undefined;
    const title = (info?.title as string) || "Untitled API";

    let baseUrl = "";
    const servers = data.servers as Array<{ url?: string }> | undefined;
    if (servers !== undefined && servers.length > 0 && servers[0]) {
      baseUrl = servers[0].url ?? "";
    } else if (data.host !== undefined) {
      const schemes = data.schemes as string[] | undefined;
      const protocol =
        schemes !== undefined && schemes.includes("https") ? "https" : "http";
      baseUrl = `${protocol}://${data.host}`;
      if (data.basePath !== undefined) {
        baseUrl += String(data.basePath);
      }
    }

    const components = data.components as Record<string, unknown> | undefined;
    const spec: OpenAPISpec = {
      name: title,
      description: info?.description as string | undefined,
      version: (info?.version as string) || "1.0.0",
      baseUrl,
      requests: [],
      securitySchemes:
        (components?.securitySchemes as Record<string, unknown>) ??
        (data.securityDefinitions as Record<string, unknown>),
    };

    const pathsObj = (data.paths as Record<string, unknown>) ?? {};
    spec.requests = await extractOpenAPIRequests(sdk, pathsObj, baseUrl, data);

    return spec;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse OpenAPI specification: ${message}`);
  }
}

async function extractOpenAPIRequests(
  sdk: SDK,
  paths: Record<string, unknown>,
  baseUrl: string,
  spec: Record<string, unknown>,
): Promise<OpenAPIRequest[]> {
  const requests: OpenAPIRequest[] = [];
  const httpMethods = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "trace",
  ];

  for (const [path, pathItem] of Object.entries(paths)) {
    const item = pathItem as Record<string, unknown>;
    for (const method of httpMethods) {
      if (item[method] !== undefined) {
        const operation = item[method] as Record<string, unknown>;
        const request = await parseOpenAPIOperation(
          sdk,
          method,
          path,
          operation,
          baseUrl,
          spec,
        );
        if (request) {
          requests.push(request);
        }
      }
    }
  }

  return requests;
}

function resolveSchemaRef(
  ref: string,
  spec: Record<string, unknown>,
  visited: Set<string> = new Set(),
): unknown {
  if (visited.has(ref)) {
    return { type: "object", description: `Circular reference to ${ref}` };
  }

  visited.add(ref);

  if (!ref.startsWith("#/")) {
    return undefined;
  }

  const path = ref.substring(2).split("/");
  let current: unknown = spec;

  for (const segment of path) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object" ||
      !(segment in current)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (
    current !== undefined &&
    current !== null &&
    typeof current === "object" &&
    "$ref" in current
  ) {
    return resolveSchemaRef(
      (current as Record<string, unknown>).$ref as string,
      spec,
      visited,
    );
  }

  return current;
}

function generateExampleFromSchema(
  schema: unknown,
  spec: Record<string, unknown>,
  visited: Set<string> = new Set(),
): unknown {
  if (schema === undefined || schema === null || typeof schema !== "object") {
    return undefined;
  }

  const s = schema as Record<string, unknown>;
  if (s.$ref !== undefined) {
    if (visited.has(s.$ref as string)) {
      return undefined;
    }
    const resolvedSchema = resolveSchemaRef(
      s.$ref as string,
      spec,
      new Set(visited),
    );
    if (resolvedSchema !== undefined) {
      visited.add(s.$ref as string);
      return generateExampleFromSchema(resolvedSchema, spec, visited);
    }
    return undefined;
  }

  if (s.example !== undefined) {
    return s.example;
  }
  const schemaType = s.type as string | undefined;
  switch (schemaType) {
    case "string": {
      const enumArr = s.enum as unknown[] | undefined;
      if (enumArr !== undefined && enumArr.length > 0) {
        return enumArr[0];
      }
      const format = s.format as string | undefined;
      if (format === "email") return "user@example.com";
      if (format === "date") return "2024-01-01";
      if (format === "date-time") return "2024-01-01T00:00:00Z";
      if (format === "uuid") return "550e8400-e29b-41d4-a716-446655440000";
      return s.pattern !== undefined ? "example" : "string";
    }
    case "number":
    case "integer": {
      const enumArr = s.enum as unknown[] | undefined;
      if (enumArr !== undefined && enumArr.length > 0) {
        return enumArr[0];
      }
      return s.minimum !== undefined ? s.minimum : 0;
    }
    case "boolean":
      return true;
    case "array": {
      const items = s.items;
      if (items !== undefined) {
        const itemExample = generateExampleFromSchema(items, spec, visited);
        return itemExample !== undefined ? [itemExample] : [];
      }
      return [];
    }
    case "object": {
      const obj: Record<string, unknown> = {};
      const properties = s.properties as Record<string, unknown> | undefined;
      if (properties !== undefined) {
        for (const [propName, propSchema] of Object.entries(properties)) {
          const propExample = generateExampleFromSchema(
            propSchema,
            spec,
            visited,
          );
          if (propExample !== undefined) {
            obj[propName] = propExample;
          }
        }
      }
      const required = s.required as string[] | undefined;
      if (required !== undefined && Array.isArray(required)) {
        for (const requiredProp of required) {
          if (
            !(requiredProp in obj) &&
            properties?.[requiredProp] !== undefined
          ) {
            const propExample = generateExampleFromSchema(
              properties[requiredProp],
              spec,
              visited,
            );
            obj[requiredProp] =
              propExample !== undefined ? propExample : "required_value";
          }
        }
      }
      return Object.keys(obj).length > 0 ? obj : undefined;
    }
    default:
      return undefined;
  }
}

async function parseOpenAPIOperation(
  sdk: SDK,
  method: string,
  path: string,
  operation: Record<string, unknown>,
  baseUrl: string,
  spec: Record<string, unknown>,
): Promise<OpenAPIRequest | undefined> {
  try {
    const upperMethod = method.toUpperCase();
    const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;

    const operationName =
      (operation.summary as string) ||
      (operation.operationId as string) ||
      `${upperMethod} ${path}`;

    const request: OpenAPIRequest = {
      id:
        (operation.operationId as string) ||
        `${upperMethod}_${path.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
      name: operationName,
      method: upperMethod,
      url: fullUrl,
      headers: {},
      parameters: [],
    };

    const parameters = operation.parameters as
      | Array<Record<string, unknown>>
      | undefined;
    if (parameters !== undefined && Array.isArray(parameters)) {
      for (const param of parameters) {
        request.parameters.push({
          name: (param.name as string) ?? "",
          in: (param.in as OpenAPIRequest["parameters"][0]["in"]) ?? "query",
          required: (param.required as boolean) ?? false,
          schema: (param.schema ?? param.type ?? "string") as unknown,
          example: param.example,
        });
        if (param.in === "header" && param.example !== undefined) {
          request.headers[(param.name as string) ?? ""] = String(param.example);
        }
      }
    }

    const requestBody = operation.requestBody as
      | Record<string, unknown>
      | undefined;
    if (
      requestBody !== undefined &&
      ["POST", "PUT", "PATCH"].includes(upperMethod)
    ) {
      const content = requestBody.content as
        | Record<string, unknown>
        | undefined;
      if (content) {
        const supportedTypes = [
          "application/json",
          "application/x-www-form-urlencoded",
          "multipart/form-data",
        ];
        let contentType = "";
        let bodySchema: unknown = undefined;
        let bodyExample: unknown = undefined;

        for (const type of supportedTypes) {
          const ct = content?.[type] as Record<string, unknown> | undefined;
          if (ct !== undefined) {
            contentType = type;
            bodySchema = ct.schema;
            bodyExample = ct.example ?? ct.examples;
            break;
          }
        }

        if (
          contentType !== "" &&
          bodySchema !== undefined &&
          bodySchema !== null
        ) {
          if (bodyExample === undefined && contentType === "application/json") {
            try {
              const generatedExample = generateExampleFromSchema(
                bodySchema,
                spec,
              );
              if (generatedExample !== undefined) {
                bodyExample = generatedExample;
              }
            } catch (error) {
              sdk.console.warn(
                `Failed to generate example from schema: ${error}`,
              );
            }
          }

          request.body = {
            contentType,
            schema: bodySchema,
            example: bodyExample,
          };

          request.headers["Content-Type"] = contentType;
        }
      }
    }

    const responses = operation.responses as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (responses !== undefined) {
      const successResponse =
        responses["200"] ?? responses["201"] ?? responses["default"];
      const headers = successResponse?.headers as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (headers !== undefined) {
        for (const [headerName, headerSpec] of Object.entries(headers)) {
          const specObj = headerSpec;
          if (
            specObj !== undefined &&
            typeof specObj === "object" &&
            specObj.example !== undefined &&
            headerName.toLowerCase().includes("auth")
          ) {
            request.headers[headerName] = String(specObj.example);
          }
        }
      }
    }

    return request;
  } catch {
    return undefined;
  }
}

export function detectOpenAPIAuth(spec: OpenAPISpec): {
  hasAuth: boolean;
  authType: string;
  description: string;
  schemes: Array<{ name: string; type: string; description: string }>;
} {
  const schemes: Array<{ name: string; type: string; description: string }> =
    [];

  if (spec.securitySchemes) {
    for (const [name, scheme] of Object.entries(spec.securitySchemes)) {
      const s = scheme as Record<string, unknown>;
      const schemeType = (s.type as string) ?? "unknown";
      let description = "";

      switch (schemeType) {
        case "http":
          description = `HTTP ${String(s.scheme ?? "")} authentication`;
          break;
        case "apiKey":
          description = `API key in ${String(s.in ?? "")}: ${String(s.name ?? "")}`;
          break;
        case "oauth2":
          description = "OAuth 2.0 authentication";
          break;
        case "openIdConnect":
          description = "OpenID Connect authentication";
          break;
        default:
          description = `${schemeType} authentication`;
      }

      schemes.push({
        name,
        type: schemeType,
        description,
      });
    }
  }

  const authHeaders = ["authorization", "x-api-key", "x-auth-token"];

  for (const request of spec.requests) {
    for (const headerName of Object.keys(request.headers)) {
      if (authHeaders.some((auth) => headerName.toLowerCase().includes(auth))) {
        if (!schemes.some((s) => s.type === "header")) {
          schemes.push({
            name: "header-auth",
            type: "header",
            description: `Authentication via ${headerName} header`,
          });
        }
      }
    }
  }

  if (schemes.length > 0 && schemes[0]) {
    return {
      hasAuth: true,
      authType: schemes[0].type,
      description: `Found ${schemes.length} authentication scheme(s)`,
      schemes,
    };
  }

  return {
    hasAuth: false,
    authType: "none",
    description: "No authentication schemes detected",
    schemes: [],
  };
}
