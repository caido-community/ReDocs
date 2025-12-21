import type { SDK } from "caido:plugin";

import { isPostmanEnvironment } from "../parsers/environment.js";

/**
 * File type detection result
 */
export interface FileTypeResult {
  type: "postman" | "openapi" | "environment" | "unknown";
  confidence: number; // 0-1 confidence score
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
        "Valid JSON but does not match Postman collection or OpenAPI specification format",
    };
  } catch (jsonError: any) {
    // If JSON parsing fails, check for YAML but reject it
    if (isLikelyYAML(content, fileName)) {
      return {
        type: "unknown",
        confidence: 0,
        details:
          "YAML files are not currently supported. Please convert to JSON format.",
      };
    }

    return {
      type: "unknown",
      confidence: 0,
      details: `File is not valid JSON and does not appear to be YAML: ${jsonError.message}`,
    };
  }
}

/**
 * Checks if the parsed JSON object represents a Postman collection
 * @param data - Parsed JSON data
 * @returns True if this appears to be a Postman collection
 */
function isPostmanCollection(data: any): boolean {
  // Check for required Postman collection fields
  if (!data.info || typeof data.info !== "object") {
    return false;
  }

  // Postman collections must have info.name
  if (!data.info.name || typeof data.info.name !== "string") {
    return false;
  }

  // Check for other Postman-specific indicators
  const hasPostmanSchema =
    data.info.schema &&
    typeof data.info.schema === "string" &&
    data.info.schema.includes("postman");

  const hasPostmanStructure = data.item && Array.isArray(data.item);

  const hasPostmanVersion =
    data.info._postman_id || data.info.version || hasPostmanSchema;

  // Must have either the schema indicator or the typical structure
  return hasPostmanSchema || (hasPostmanStructure && hasPostmanVersion);
}

/**
 * Checks if the parsed JSON object represents an OpenAPI specification
 * @param data - Parsed JSON data
 * @returns True if this appears to be an OpenAPI specification
 */
function isOpenAPISpec(data: any): boolean {
  // Check for OpenAPI 3.x version
  if (data.openapi && typeof data.openapi === "string") {
    return data.openapi.startsWith("3.");
  }

  // Check for Swagger 2.x version
  if (data.swagger && typeof data.swagger === "string") {
    return data.swagger.startsWith("2.");
  }

  // Additional checks for OpenAPI structure without version field
  if (
    data.info &&
    data.paths &&
    typeof data.info === "object" &&
    typeof data.paths === "object"
  ) {
    // Check if paths object contains HTTP methods
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

/**
 * Attempts to detect file type from filename patterns
 * @param fileName - Original file name
 * @returns Detected file type or 'unknown'
 */
function detectFromFilename(
  fileName: string,
): "postman" | "openapi" | "environment" | "unknown" {
  const lowerName = fileName.toLowerCase();

  // Postman environment patterns
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

  // Postman collection patterns
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

  // File extension hints
  if (lowerName.endsWith(".yaml") || lowerName.endsWith(".yml")) {
    return "openapi"; // Most YAML API files are OpenAPI specs
  }

  return "unknown";
}

/**
 * Checks if content appears to be YAML format
 * @param content - Raw file content
 * @param fileName - File name for additional context
 * @returns True if this appears to be YAML
 */
function isLikelyYAML(content: string, fileName: string): boolean {
  // Check file extension
  if (
    fileName.toLowerCase().endsWith(".yaml") ||
    fileName.toLowerCase().endsWith(".yml")
  ) {
    return true;
  }

  // Check for YAML indicators in content
  const yamlIndicators = [
    /^---\s*$/m, // Document separator
    /^\s*\w+:\s*$/m, // Key followed by colon
    /^\s*-\s+/m, // List items
    /^\s*[\w-]+:\s+[\w-]/m, // Key-value pairs
  ];

  let indicatorCount = 0;
  for (const indicator of yamlIndicators) {
    if (indicator.test(content)) {
      indicatorCount++;
    }
  }

  // If we have multiple YAML indicators and no JSON indicators, likely YAML
  const hasJsonIndicators =
    content.trim().startsWith("{") || content.trim().startsWith("[");

  return indicatorCount >= 2 && !hasJsonIndicators;
}

/**
 * Validates that the detected file type can be processed
 * @param fileType - Detected file type
 * @param fileName - Original file name
 * @returns Validation result with support info
 */
export function validateFileTypeSupport(
  fileType: "postman" | "openapi" | "environment" | "unknown",
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
          "File format not recognized. Please ensure you are uploading a valid Postman collection, OpenAPI specification, or Postman environment (.json)",
      };
  }
}
