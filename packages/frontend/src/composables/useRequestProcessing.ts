import { ref } from "vue";

import { useImportRepository } from "../repositories";
import type {
  AuthConfig,
  ImportedRequest,
  ProcessedRequest,
} from "../types/index.js";
import type { FrontendSDK } from "../types.js";
import { createFileManager } from "../utils";

import { useReplaySession } from "./useReplaySession";

export const useRequestProcessing = (sdk: FrontendSDK) => {
  const isProcessing = ref(false);
  const processingStep = ref("");

  const repository = useImportRepository(sdk);
  const replaySession = useReplaySession(sdk);
  const fileManager = createFileManager(sdk);

  const processRequests = async (
    selectedRequests: ImportedRequest[],
    collectionName: string,
    authConfig: AuthConfig,
    uploadedFileInfo?: { content: string; name: string },
  ) => {
    isProcessing.value = true;
    processingStep.value = "Processing requests...";

    try {
      const result = await repository.createSessionsFromRequests(
        selectedRequests,
        collectionName,
        authConfig,
      );

      if (result.success && result.processedRequests) {
        processingStep.value = "Creating replay sessions...";
        const createdCount = await replaySession.createReplaySessionsInFrontend(
          result.processedRequests as ProcessedRequest[],
          result.collectionName,
        );

        const message = `Successfully created ${createdCount} replay sessions!`;
        sdk.window.showToast(message, {
          variant: "success",
          duration: 4000,
        });

        if (uploadedFileInfo) {
          await fileManager.saveFileToUserFiles(
            uploadedFileInfo.name,
            uploadedFileInfo.content,
          );
        }
      } else {
        const errorMessage = result.message || "Failed to process requests";
        sdk.window.showToast(`Request processing failed: ${errorMessage}`, {
          variant: "error",
          duration: 5000,
        });
      }
    } catch (error: any) {
      sdk.window.showToast("Unexpected error: " + error.message, {
        variant: "error",
        duration: 5000,
      });
      throw error;
    } finally {
      isProcessing.value = false;
      processingStep.value = "";
    }
  };

  return {
    isProcessing,
    processingStep,
    processRequests,
  };
};
