import type { FrontendSDK } from "../types.js";

export const createFileManager = (sdk: FrontendSDK) => {
  const saveFileToUserFiles = async (
    fileName: string,
    content: string,
  ): Promise<boolean> => {
    try {
      const baseName = fileName.replace(/\.json$/i, "");
      let finalFileName = `[ReDocs]-${baseName}.json`;

      const existingFiles = sdk.files.getAll();
      let counter = 0;

      while (existingFiles.some((file: any) => file.name === finalFileName)) {
        counter++;
        finalFileName = `[ReDocs] - ${baseName}-${counter}.json`;
      }

      const file = new File([content], finalFileName, {
        type: "application/json",
      });

      await sdk.files.create(file);
      return true;
    } catch (error: any) {
      sdk.window.showToast(`Could not save file: ${error.message}`, {
        variant: "warning",
        duration: 3000,
      });
      return false;
    }
  };

  return {
    saveFileToUserFiles,
  };
};
