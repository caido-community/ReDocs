import type { SDK } from "caido:plugin";
import type { AuthConfig, SessionCreationResult } from "shared";

import { createReplaySessions } from "../replay/sessionCreator.js";

export const createSessionsFromRequests = async (
  sdk: SDK,
  requests: any[],
  collectionName: string,
  authConfig: AuthConfig,
): Promise<SessionCreationResult> => {
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
      message: `Failed to process sessions: ${error.message}`,
    };
  }
};
