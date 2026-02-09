export type {
  AuthConfig,
  AuthenticationInfo,
  EnvironmentVariable,
  ImportResult,
} from "shared";

export type ImportedRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  path?: string;
  body?: unknown;
  headers?: Record<string, string>;
  authentication?: unknown;
  [key: string]: unknown;
};

export type ProcessedRequest = {
  request: unknown;
  spec: RequestSpec;
  sessionName: string;
};

export type RequestSpec = {
  method?: string;
  host?: string;
  port?: number;
  path?: string;
  query?: string;
  headers?: Record<string, string>;
  body?: string;
  tls?: boolean;
};

export type PageType = "Import" | "Docs";

export type CollectionSourceType = "postman" | "openapi" | "insomnia";

export function collectionTypeToLabel(type: CollectionSourceType): string {
  switch (type) {
    case "postman":
      return "Postman";
    case "openapi":
      return "OpenAPI";
    case "insomnia":
      return "Insomnia";
    default:
      return "Collection";
  }
}
