import type { DefineAPI, SDK } from "caido:plugin";

import {
  createEnvironmentVariables,
  createSessionsFromRequests,
  processImportFile,
} from "./api/index.js";

export * from "./parsers/postman.js";
export * from "./parsers/openapi.js";
export * from "./parsers/environment.js";
export * from "./utils/fileDetection.js";
export * from "./types.js";

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
