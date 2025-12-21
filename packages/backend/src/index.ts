import type { DefineAPI, SDK } from "caido:plugin";

import { parsePostmanEnvironment } from "./parsers/environment.js";
import { detectOpenAPIAuth, parseOpenAPISpec } from "./parsers/openapi.js";
import {
  detectPostmanAuth,
  parsePostmanCollection,
} from "./parsers/postman.js";
import {
  type AuthConfig,
  createReplaySessions,
} from "./replay/sessionCreator.js";
import {
  convertToCaidoVariables,
  createCaidoEnvironment,
  validateEnvironmentCreation,
} from "./utils/environmentCreation.js";
import {
  detectFileType,
  validateFileTypeSupport,
} from "./utils/fileDetection.js";

// Export types for public usage
export * from "./parsers/postman.js";
export * from "./parsers/openapi.js";
export * from "./parsers/environment.js";
export * from "./utils/environmentCreation.js";
export * from "./utils/fileDetection.js";

const processImportFile = async (
  sdk: SDK,
  fileContent: string,
  fileName: string,
) => {
  try {
    const detectionResult = detectFileType(sdk, fileContent, fileName);

    const validation = validateFileTypeSupport(detectionResult.type, fileName);

    if (!validation.supported) {
      return {
        success: false,
        error: validation.message,
        fileType: detectionResult.type,
        detection: detectionResult,
        message: `Cannot process ${fileName}: ${validation.message} `,
      };
    }

    let result: any = {};
    let authInfo: any = {};

    if (detectionResult.type === "postman") {
      const collection = await parsePostmanCollection(sdk, fileContent);
      authInfo = detectPostmanAuth(collection);

      result = {
        success: true,
        type: "postman",
        collectionName: collection.name,
        description: collection.description,
        sessionCount: collection.requests.length,
        requests: collection.requests,
        authentication: authInfo,
        message: `Successfully parsed Postman collection "${collection.name}" with ${collection.requests.length} requests`,
      };
    } else if (detectionResult.type === "openapi") {
      const isYaml =
        fileName.toLowerCase().endsWith(".yaml") ||
        fileName.toLowerCase().endsWith(".yml");
      const spec = await parseOpenAPISpec(sdk, fileContent, isYaml);
      authInfo = detectOpenAPIAuth(spec);

      result = {
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
    } else if (detectionResult.type === "environment") {
      const environment = await parsePostmanEnvironment(sdk, fileContent);

      result = {
        success: true,
        type: "environment",
        environmentName: environment.name,
        description: environment.description,
        variables: environment.variables,
        variableCount: environment.variables.length,
        message: `Successfully parsed Postman environment "${environment.name}" with ${environment.variables.length} variables`,
      };
    } else {
      throw new Error(`Unsupported file type: ${detectionResult.type} `);
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: `Failed to process ${fileName}: ${error.message} `,
    };
  }
};

const createSessionsFromRequests = async (
  sdk: SDK,
  requests: any[],
  collectionName: string,
  authConfig: AuthConfig,
) => {
  try {
    const result = await createReplaySessions(
      sdk,
      requests,
      collectionName,
      authConfig,
    );
    return result;
  } catch (error: any) {
    return {
      success: false,
      processedRequests: [],
      collectionName,
      message: `Failed to process sessions: ${error.message} `,
    };
  }
};

const createEnvironmentVariables = async (
  sdk: SDK,
  variables: Array<{
    key: string;
    value: string;
    enabled: boolean;
    isSecret: boolean;
  }>,
  originalEnvironmentName: string,
) => {
  try {
    const convertedVariables = convertToCaidoVariables(variables);

    const validation = validateEnvironmentCreation(
      convertedVariables,
      originalEnvironmentName,
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        message: `Validation failed: ${validation.error} `,
      };
    }

    const result = await createCaidoEnvironment(
      sdk,
      convertedVariables,
      originalEnvironmentName,
    );

    return result;
  } catch (error: any) {
    const errorMessage = `Failed to create environment: ${error.message || error} `;

    return {
      success: false,
      environmentName: `[ReDocs] - ${originalEnvironmentName} `,
      variablesCreated: 0,
      message: errorMessage,
      error: errorMessage,
    };
  }
};

export type API = DefineAPI<{
  processImportFile: typeof processImportFile;
  createSessionsFromRequests: typeof createSessionsFromRequests;
  createEnvironmentVariables: typeof createEnvironmentVariables;
}>;

export function init(sdk: SDK<API>) {
  sdk.api.register("processImportFile", processImportFile);
  sdk.api.register("createSessionsFromRequests", createSessionsFromRequests);
  sdk.api.register("createEnvironmentVariables", createEnvironmentVariables);
}
