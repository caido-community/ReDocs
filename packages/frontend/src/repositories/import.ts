import type {
  AuthConfig,
  EnvironmentVariable,
  ImportedRequest,
} from "../types/";
import type { FrontendSDK } from "../types.js";

export const useImportRepository = (sdk: FrontendSDK) => {
  const createSessionsFromRequests = async (
    selectedRequests: ImportedRequest[],
    collectionName: string,
    authConfig: AuthConfig,
  ) => {
    return await sdk.backend.createSessionsFromRequests(
      selectedRequests,
      collectionName,
      authConfig,
    );
  };

  const createEnvironmentVariables = async (
    selectedVariables: EnvironmentVariable[],
    environmentName: string,
  ) => {
    return await sdk.backend.createEnvironmentVariables(
      selectedVariables,
      environmentName,
    );
  };

  return {
    createSessionsFromRequests,
    createEnvironmentVariables,
  };
};
