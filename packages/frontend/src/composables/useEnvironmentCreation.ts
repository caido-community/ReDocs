import { ref } from "vue";

import { useImportRepository } from "../repositories";
import type { EnvironmentVariable } from "../types/index.js";
import type { FrontendSDK } from "../types.js";
import { createFileManager } from "../utils";

export const useEnvironmentCreation = (sdk: FrontendSDK) => {
  const isCreating = ref(false);
  const creationStep = ref("");

  const repository = useImportRepository(sdk);
  const fileManager = createFileManager(sdk);

  const createEnvironment = async (
    selectedVariables: EnvironmentVariable[],
    envName: string,
    uploadedFileInfo?: { content: string; name: string },
  ) => {
    isCreating.value = true;
    creationStep.value = "Creating new environment...";

    try {
      const baseEnvironmentName = `[ReDocs]-${envName}`;
      let uniqueEnvironmentName = baseEnvironmentName;
      let counter = 1;

      while (true) {
        try {
          await sdk.graphql.createEnvironment({
            input: {
              name: uniqueEnvironmentName,
              variables: [],
            },
          });
          break;
        } catch (error: any) {
          if (error.message && error.message.includes("already exists")) {
            uniqueEnvironmentName = `${baseEnvironmentName}-${counter}`;
            counter++;
            if (counter > 100) {
              throw new Error("Too many environment name collisions");
            }
          } else {
            throw error;
          }
        }
      }

      const result = await repository.createEnvironmentVariables(
        selectedVariables,
        uniqueEnvironmentName,
      );

      if (result.success) {
        const message = `Successfully created environment "${uniqueEnvironmentName}" with ${result.variablesCreated ?? 0} variables!`;
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
        const errorMessage =
          result.message || result.error || "No variables were created";
        sdk.window.showToast(`Environment creation failed: ${errorMessage}`, {
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
      isCreating.value = false;
      creationStep.value = "";
    }
  };

  return {
    isCreating,
    creationStep,
    createEnvironment,
  };
};
