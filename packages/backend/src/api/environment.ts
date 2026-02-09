import type { SDK } from "caido:plugin";
import type { EnvironmentVariable } from "shared";

import { createEnvironmentVariables as createEnvironmentService } from "../services/environment.js";

export const createEnvironmentVariables = async (
  sdk: SDK,
  variables: EnvironmentVariable[],
  originalEnvironmentName: string,
) => {
  return await createEnvironmentService(
    sdk,
    variables,
    originalEnvironmentName,
  );
};
