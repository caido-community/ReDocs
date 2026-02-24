import type { SDK } from "caido:plugin";

import { processImportFile as processImportFileService } from "../services/import.js";

export const processImportFile = async (
  sdk: SDK,
  fileContent: string,
  fileName: string,
) => {
  return await processImportFileService(sdk, fileContent, fileName);
};
