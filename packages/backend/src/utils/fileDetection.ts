import type { SDK } from "caido:plugin";

import { isPostmanEnvironment } from "../parsers/environment.js";

import { parseFirstDocument } from "./minimalYaml.js";

/**
 * File type detection result
 */
export interface FileTypeResult {
  type:
    | "postman"
    | "openapi"
    | "environment"
    | "insomnia"
    | "bruno"
    | "unknown";
  confidence: number;
  details: string;
}

/**
 * Detects the type of API documentation file based on content analysis
 * @param sdk - Caido SDK instance
 * @param content - Raw file content
 * @param fileName - Original file name (for additional hints)
 * @returns File type detection result
 */
export function detectFileType(
  sdk: SDK,
  content: string,
  fileName: string,
): FileTypeResult {
  try {
    // Parse as JSON first
    const data = JSON.parse(content);

    if (isPostmanCollection(data)) {
      return {
        type: "postman",
        confidence: 0.95,
        details: `Postman collection detected - contains info.name: "${data.info?.name}"`,
      };
    }

    if (isOpenAPISpec(data)) {
      const version = data.openapi || data.swagger;
      return {
        type: "openapi",
        confidence: 0.95,
        details: `OpenAPI specification detected - version: ${version}`,
      };
    }

    const isEnvFile = isPostmanEnvironment(content, fileName);

    if (isEnvFile) {
      return {
        type: "environment",
        confidence: 0.95,
        details: `Postman environment detected - name: "${data.name}"`,
      };
    }

    if (isInsomniaExport(data)) {
      return {
        type: "insomnia",
        confidence: 0.95,
        details: "Insomnia export detected - contains request resources",
      };
    }

    const fileTypeFromName = detectFromFilename(fileName);
    if (fileTypeFromName !== "unknown") {
      return {
        type: fileTypeFromName,
        confidence: 0.6,
        details: `Detected from filename pattern. Please verify content is valid ${fileTypeFromName} format.`,
      };
    }

    return {
      type: "unknown",
      confidence: 0,
      details:
        "Valid JSON but does not match Postman collection, OpenAPI specification, or Insomnia export format",
    };
  } catch (jsonError: unknown) {
    if (isLikelyYAML(content, fileName)) {
      const yamlData = parseFirstDocument(content);
      if (yamlData !== undefined && isBrunoOpenCollectionYaml(yamlData)) {
        return {
          type: "bruno",
          confidence: 0.95,
          details: "Bruno OpenCollection YAML detected",
        };
      }
      return {
        type: "unknown",
        confidence: 0,
        details:
          "YAML format not recognized. Use Bruno OpenCollection YAML (.yaml/.yml) with info and http sections.",
      };
    }

    const message =
      jsonError instanceof Error ? jsonError.message : String(jsonError);
    return {
      type: "unknown",
      confidence: 0,
      details: `File is not valid JSON and does not appear to be YAML: ${message}`,
    };
  }
}

function isBrunoOpenCollectionYaml(data: unknown): boolean {
  const doc = Array.isArray(data) ? data[0] : data;
  if (doc === undefined || doc === null || typeof doc !== "object")
    return false;
  const o = doc as Record<string, unknown>;
  const info = o.info;
  const http = o.http;
  if (
    info === undefined ||
    info === null ||
    typeof info !== "object" ||
    http === undefined ||
    http === null ||
    typeof http !== "object"
  )
    return false;
  const infoObj = info as Record<string, unknown>;
  const httpObj = http as Record<string, unknown>;
  const type = infoObj.type;
  const method = httpObj.method;
  const url = httpObj.url;
  return (
    type === "http" && typeof method === "string" && typeof url === "string"
  );
}

function isPostmanCollection(data: any): boolean {
  if (!data.info || typeof data.info !== "object") {
    return false;
  }

  if (!data.info.name || typeof data.info.name !== "string") {
    return false;
  }

  const hasPostmanSchema =
    data.info.schema &&
    typeof data.info.schema === "string" &&
    data.info.schema.includes("postman");

  const hasPostmanStructure = data.item && Array.isArray(data.item);

  const hasPostmanVersion =
    data.info._postman_id || data.info.version || hasPostmanSchema;

  return hasPostmanSchema || (hasPostmanStructure && hasPostmanVersion);
}

function isOpenAPISpec(data: any): boolean {
  if (data.openapi && typeof data.openapi === "string") {
    return data.openapi.startsWith("3.");
  }

  if (data.swagger && typeof data.swagger === "string") {
    return data.swagger.startsWith("2.");
  }

  if (
    data.info &&
    data.paths &&
    typeof data.info === "object" &&
    typeof data.paths === "object"
  ) {
    const pathKeys = Object.keys(data.paths);
    if (pathKeys.length > 0 && pathKeys[0]) {
      const firstPath = data.paths[pathKeys[0]];
      if (firstPath && typeof firstPath === "object") {
        const httpMethods = [
          "get",
          "post",
          "put",
          "patch",
          "delete",
          "head",
          "options",
        ];
        const hasHttpMethods = httpMethods.some(
          (method) => method in firstPath,
        );
        if (hasHttpMethods) {
          return true;
        }
      }
    }
  }

  return false;
}

function isInsomniaExport(data: Record<string, unknown>): boolean {
  if (!data || typeof data !== "object") return false;
  const resources = data.resources;
  if (!Array.isArray(resources) || resources.length === 0) return false;
  const hasRequest = resources.some((r) => {
    if (r === undefined || r === null || typeof r !== "object") return false;
    const t = (r as Record<string, unknown>)._type;
    return typeof t === "string" && t.toLowerCase() === "request";
  });
  return hasRequest;
}

function detectFromFilename(
  fileName: string,
): "postman" | "openapi" | "environment" | "insomnia" | "bruno" | "unknown" {
  const lowerName = fileName.toLowerCase();

  const brunoPatterns = ["bruno", "opencollection"];
  for (const pattern of brunoPatterns) {
    if (lowerName.includes(pattern)) return "bruno";
  }

  const insomniaPatterns = ["insomnia", "export"];

  for (const pattern of insomniaPatterns) {
    if (lowerName.includes(pattern)) {
      return "insomnia";
    }
  }

  const environmentPatterns = [
    "environment",
    "env",
    ".postman_environment.",
    "_environment.",
    "postman_env",
  ];

  for (const pattern of environmentPatterns) {
    if (lowerName.includes(pattern)) {
      return "environment";
    }
  }

  const postmanPatterns = [
    "postman_collection",
    "collection",
    "newman",
    ".postman_collection.",
    "_collection.",
    "api_collection",
    "requests",
  ];

  for (const pattern of postmanPatterns) {
    if (lowerName.includes(pattern)) {
      return "postman";
    }
  }

  // OpenAPI specification patterns
  const openApiPatterns = [
    "openapi",
    "swagger",
    "api-docs",
    "api_spec",
    "spec.json",
    "spec.yaml",
    "spec.yml",
    "oas",
    "rest-api",
  ];

  for (const pattern of openApiPatterns) {
    if (lowerName.includes(pattern)) {
      return "openapi";
    }
  }

  if (lowerName.endsWith(".yaml") || lowerName.endsWith(".yml")) {
    return "openapi";
  }

  return "unknown";
}

function isLikelyYAML(content: string, fileName: string): boolean {
  // Check file extension
  if (
    fileName.toLowerCase().endsWith(".yaml") ||
    fileName.toLowerCase().endsWith(".yml")
  ) {
    return true;
  }

  const yamlIndicators = [
    /^---\s*$/m,
    /^\s*\w+:\s*$/m,
    /^\s*-\s+/m,
    /^\s*[\w-]+:\s+[\w-]/m,
  ];

  let indicatorCount = 0;
  for (const indicator of yamlIndicators) {
    if (indicator.test(content)) {
      indicatorCount++;
    }
  }

  const hasJsonIndicators =
    content.trim().startsWith("{") || content.trim().startsWith("[");

  return indicatorCount >= 2 && !hasJsonIndicators;
}

export function validateFileTypeSupport(
  fileType:
    | "postman"
    | "openapi"
    | "environment"
    | "insomnia"
    | "bruno"
    | "unknown",
  fileName: string,
): {
  supported: boolean;
  message: string;
} {
  switch (fileType) {
    case "postman":
      return {
        supported: true,
        message: "Postman collections are fully supported",
      };

    case "insomnia":
      return {
        supported: true,
        message: "Insomnia exports are fully supported",
      };

    case "bruno":
      return {
        supported: true,
        message: "Bruno OpenCollection YAML is fully supported",
      };

    case "openapi": {
      const isYaml =
        fileName.toLowerCase().endsWith(".yaml") ||
        fileName.toLowerCase().endsWith(".yml");
      if (isYaml) {
        return {
          supported: false,
          message:
            "YAML OpenAPI specifications will be supported in a future update. Please convert to JSON format.",
        };
      }
      return {
        supported: true,
        message: "JSON OpenAPI specifications are fully supported",
      };
    }

    case "environment":
      return {
        supported: true,
        message: "Postman environment files are fully supported",
      };

    case "unknown":
    default:
      return {
        supported: false,
        message:
          "File format not recognized. Please ensure you are uploading a valid Postman collection, OpenAPI specification, Insomnia export, Bruno OpenCollection YAML, or Postman environment (.json)",
      };
  }
}
