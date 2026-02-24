import type { SDK } from "caido:plugin";
import type { ImportResult } from "shared";

import {
  detectBrunoAuth,
  parseBrunoOpenCollectionYaml,
} from "../parsers/bruno.js";
import { parsePostmanEnvironment } from "../parsers/environment.js";
import {
  detectInsomniaAuth,
  parseInsomniaExport,
} from "../parsers/insomnia.js";
import { detectOpenAPIAuth, parseOpenAPISpec } from "../parsers/openapi.js";
import {
  detectPostmanAuth,
  parsePostmanCollection,
} from "../parsers/postman.js";
import {
  detectFileType,
  validateFileTypeSupport,
} from "../utils/fileDetection.js";

export const processImportFile = async (
  sdk: SDK,
  fileContent: string,
  fileName: string,
): Promise<ImportResult> => {
  try {
    const detectionResult = detectFileType(sdk, fileContent, fileName);

    const validation = validateFileTypeSupport(detectionResult.type, fileName);

    if (!validation.supported) {
      return {
        success: false,
        error: validation.message,
        type: detectionResult.type,
        message: `Cannot process ${fileName}: ${validation.message}`,
      };
    }

    if (detectionResult.type === "postman") {
      const collection = await parsePostmanCollection(sdk, fileContent);
      const authInfo = detectPostmanAuth(collection);

      return {
        success: true,
        type: "postman",
        collectionName: collection.name,
        description: collection.description,
        sessionCount: collection.requests.length,
        requests: collection.requests,
        authentication: authInfo,
        message: `Successfully parsed Postman collection "${collection.name}" with ${collection.requests.length} requests`,
      };
    }

    if (detectionResult.type === "openapi") {
      const isYaml =
        fileName.toLowerCase().endsWith(".yaml") ||
        fileName.toLowerCase().endsWith(".yml");
      const spec = await parseOpenAPISpec(sdk, fileContent, isYaml);
      const authInfo = detectOpenAPIAuth(spec);

      return {
        success: true,
        type: "openapi",
        collectionName: spec.name,
        description: spec.description,
        version: spec.version,
        baseUrl: spec.baseUrl,
        sessionCount: spec.requests.length,
        requests: spec.requests,
        authentication: authInfo,
        message: `Successfully parsed OpenAPI specification "${spec.name}" with ${spec.requests.length} requests`,
      };
    }

    if (detectionResult.type === "insomnia") {
      const collection = await parseInsomniaExport(sdk, fileContent);
      const authInfo = detectInsomniaAuth(collection);

      return {
        success: true,
        type: "insomnia",
        collectionName: collection.name,
        description: collection.description,
        sessionCount: collection.requests.length,
        requests: collection.requests,
        authentication: authInfo,
        message: `Successfully parsed Insomnia export "${collection.name}" with ${collection.requests.length} requests`,
      };
    }

    if (detectionResult.type === "bruno") {
      const collection = await parseBrunoOpenCollectionYaml(
        sdk,
        fileContent,
        fileName,
      );
      const authInfo = detectBrunoAuth(collection);

      return {
        success: true,
        type: "bruno",
        collectionName: collection.name,
        description: collection.description,
        sessionCount: collection.requests.length,
        requests: collection.requests,
        authentication: authInfo,
        message: `Successfully parsed Bruno OpenCollection "${collection.name}" with ${collection.requests.length} requests`,
      };
    }

    if (detectionResult.type === "environment") {
      const environment = await parsePostmanEnvironment(sdk, fileContent);

      return {
        success: true,
        type: "environment",
        environmentName: environment.name,
        description: environment.description,
        variables: environment.variables,
        variableCount: environment.variables.length,
        message: `Successfully parsed Postman environment "${environment.name}" with ${environment.variables.length} variables`,
      };
    }

    throw new Error(`Unsupported file type: ${detectionResult.type}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
      message: `Failed to process ${fileName}: ${message}`,
    };
  }
};
