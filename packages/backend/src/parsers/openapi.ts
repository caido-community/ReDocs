import type { SDK } from "caido:plugin";

export interface OpenAPIRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: {
    contentType: string;
    schema?: any;
    example?: any;
  };
  parameters: Array<{
    name: string;
    in: "query" | "header" | "path" | "cookie";
    required: boolean;
    schema: any;
    example?: any;
  }>;
}

export interface OpenAPISpec {
  name: string;
  description?: string;
  version: string;
  baseUrl: string;
  requests: OpenAPIRequest[];
  securitySchemes?: Record<string, any>;
}

export async function parseOpenAPISpec(
  sdk: SDK,
  content: string,
  isYaml: boolean = false,
): Promise<OpenAPISpec> {
  try {
    let data: any;

    if (isYaml) {
      throw new Error(
        "YAML format is not currently supported. Please convert your OpenAPI specification to JSON format and try again.",
      );
    } else {
      data = JSON.parse(content);
    }

    if (!data.openapi && !data.swagger) {
      throw new Error(
        "Invalid OpenAPI specification: missing openapi/swagger version",
      );
    }

    const title = data.info?.title || "Untitled API";

    let baseUrl = "";
    if (data.servers && data.servers.length > 0) {
      baseUrl = data.servers[0].url;
    } else if (data.host) {
      const protocol =
        data.schemes && data.schemes.includes("https") ? "https" : "http";
      baseUrl = `${protocol}://${data.host}`;
      if (data.basePath) {
        baseUrl += data.basePath;
      }
    }

    const spec: OpenAPISpec = {
      name: title,
      description: data.info?.description,
      version: data.info?.version || "1.0.0",
      baseUrl,
      requests: [],
      securitySchemes:
        data.components?.securitySchemes || data.securityDefinitions,
    };

    spec.requests = await extractOpenAPIRequests(
      sdk,
      data.paths || {},
      baseUrl,
      data,
    );

    return spec;
  } catch (error: any) {
    throw new Error(`Failed to parse OpenAPI specification: ${error.message}`);
  }
}

async function extractOpenAPIRequests(
  sdk: SDK,
  paths: Record<string, any>,
  baseUrl: string,
  spec: any,
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
    for (const method of httpMethods) {
      if (pathItem[method]) {
        const operation = pathItem[method];
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
  spec: any,
  visited: Set<string> = new Set(),
): any {
  if (visited.has(ref)) {
    return { type: "object", description: `Circular reference to ${ref}` };
  }

  visited.add(ref);

  if (!ref.startsWith("#/")) {
    return null;
  }

  const path = ref.substring(2).split("/");
  let current = spec;

  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }

  if (current && typeof current === "object" && current.$ref) {
    return resolveSchemaRef(current.$ref, spec, visited);
  }

  return current;
}

function generateExampleFromSchema(
  schema: any,
  spec: any,
  visited: Set<string> = new Set(),
): any {
  if (!schema || typeof schema !== "object") {
    return null;
  }

  if (schema.$ref) {
    if (visited.has(schema.$ref)) {
      return null;
    }
    const resolvedSchema = resolveSchemaRef(
      schema.$ref,
      spec,
      new Set(visited),
    );
    if (resolvedSchema) {
      visited.add(schema.$ref);
      return generateExampleFromSchema(resolvedSchema, spec, visited);
    }
    return null;
  }

  if (schema.example !== undefined) {
    return schema.example;
  }
  switch (schema.type) {
    case "string":
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      if (schema.format === "email") {
        return "user@example.com";
      }
      if (schema.format === "date") {
        return "2024-01-01";
      }
      if (schema.format === "date-time") {
        return "2024-01-01T00:00:00Z";
      }
      if (schema.format === "uuid") {
        return "550e8400-e29b-41d4-a716-446655440000";
      }
      return schema.pattern ? "example" : "string";

    case "number":
    case "integer":
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      return schema.minimum !== undefined ? schema.minimum : 0;

    case "boolean":
      return true;

    case "array":
      if (schema.items) {
        const itemExample = generateExampleFromSchema(
          schema.items,
          spec,
          visited,
        );
        return itemExample !== null ? [itemExample] : [];
      }
      return [];

    case "object": {
      const obj: any = {};

      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(
          schema.properties,
        )) {
          const propExample = generateExampleFromSchema(
            propSchema,
            spec,
            visited,
          );
          if (propExample !== null) {
            obj[propName] = propExample;
          }
        }
      }

      if (schema.required && Array.isArray(schema.required)) {
        for (const requiredProp of schema.required) {
          if (
            !(requiredProp in obj) &&
            schema.properties &&
            schema.properties[requiredProp]
          ) {
            const propExample = generateExampleFromSchema(
              schema.properties[requiredProp],
              spec,
              visited,
            );
            if (propExample !== null) {
              obj[requiredProp] = propExample;
            } else {
              obj[requiredProp] = "required_value";
            }
          }
        }
      }

      return Object.keys(obj).length > 0 ? obj : null;
    }

    default:
      return null;
  }
}

async function parseOpenAPIOperation(
  sdk: SDK,
  method: string,
  path: string,
  operation: any,
  baseUrl: string,
  spec: any,
): Promise<OpenAPIRequest | undefined> {
  try {
    const upperMethod = method.toUpperCase();
    const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;

    const operationName =
      operation.summary || operation.operationId || `${upperMethod} ${path}`;

    const request: OpenAPIRequest = {
      id:
        operation.operationId ||
        `${upperMethod}_${path.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
      name: operationName,
      method: upperMethod,
      url: fullUrl,
      headers: {},
      parameters: [],
    };

    if (operation.parameters && Array.isArray(operation.parameters)) {
      for (const param of operation.parameters) {
        request.parameters.push({
          name: param.name,
          in: param.in,
          required: param.required || false,
          schema: param.schema || param.type || "string",
          example: param.example,
        });

        if (param.in === "header" && param.example) {
          request.headers[param.name] = param.example.toString();
        }
      }
    }

    if (
      operation.requestBody &&
      ["POST", "PUT", "PATCH"].includes(upperMethod)
    ) {
      const content = operation.requestBody.content;
      if (content) {
        const supportedTypes = [
          "application/json",
          "application/x-www-form-urlencoded",
          "multipart/form-data",
        ];
        let contentType = "";
        let bodySchema = null;
        let bodyExample = null;

        for (const type of supportedTypes) {
          if (content[type]) {
            contentType = type;
            bodySchema = content[type].schema;
            bodyExample = content[type].example || content[type].examples;
            break;
          }
        }

        if (contentType && bodySchema) {
          if (!bodyExample && contentType === "application/json") {
            try {
              const generatedExample = generateExampleFromSchema(
                bodySchema,
                spec,
              );
              if (generatedExample !== null) {
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

    if (operation.responses) {
      const successResponse =
        operation.responses["200"] ||
        operation.responses["201"] ||
        operation.responses["default"];

      if (successResponse && successResponse.headers) {
        for (const [headerName, headerSpec] of Object.entries(
          successResponse.headers,
        )) {
          if (
            headerSpec &&
            typeof headerSpec === "object" &&
            (headerSpec as any).example &&
            headerName.toLowerCase().includes("auth")
          ) {
            request.headers[headerName] = (
              headerSpec as any
            ).example.toString();
          }
        }
      }
    }

    return request;
  } catch (error: any) {
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
      let description = "";

      switch (scheme.type) {
        case "http":
          description = `HTTP ${scheme.scheme} authentication`;
          break;
        case "apiKey":
          description = `API key in ${scheme.in}: ${scheme.name}`;
          break;
        case "oauth2":
          description = `OAuth 2.0 authentication`;
          break;
        case "openIdConnect":
          description = `OpenID Connect authentication`;
          break;
        default:
          description = `${scheme.type} authentication`;
      }

      schemes.push({
        name,
        type: scheme.type,
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
