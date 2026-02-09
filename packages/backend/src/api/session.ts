import type { SDK } from "caido:plugin";
import type { AuthConfig } from "shared";

import { createSessionsFromRequests as createSessionsService } from "../services/session.js";

export const createSessionsFromRequests = async (
  sdk: SDK,
  requests: any[],
  collectionName: string,
  authConfig: AuthConfig,
) => {
  return await createSessionsService(sdk, requests, collectionName, authConfig);
};
