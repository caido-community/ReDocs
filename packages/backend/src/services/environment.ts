import type { SDK } from "caido:plugin";
import type { EnvironmentCreationResult, EnvironmentVariable } from "shared";

import {
  convertToCaidoVariables,
  createCaidoEnvironment,
  validateEnvironmentCreation,
} from "../utils/environmentCreation.js";

export const createEnvironmentVariables = async (
  sdk: SDK,
  variables: EnvironmentVariable[],
  originalEnvironmentName: string,
): Promise<EnvironmentCreationResult> => {
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
        message: `Validation failed: ${validation.error}`,
      };
    }

    const result = await createCaidoEnvironment(
      sdk,
      convertedVariables,
      originalEnvironmentName,
    );

    return result;
  } catch (error: any) {
    const errorMessage = `Failed to create environment: ${error.message || error}`;

    return {
      success: false,
      environmentName: `[ReDocs] - ${originalEnvironmentName}`,
      variablesCreated: 0,
      message: errorMessage,
      error: errorMessage,
    };
  }
};
