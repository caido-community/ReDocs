<script setup lang="ts">
import MenuBar from "primevue/menubar";
import { ref } from "vue";

import { AuthenticationModal } from "../components/AuthenticationModal";
import { DocumentationTab } from "../components/DocumentationTab";
import { EnvironmentModal } from "../components/EnvironmentModal";
import { FileUploadArea } from "../components/FileUploadArea";
import { RequestSelectionModal } from "../components/RequestSelectionModal";
import { useSDK } from "../plugins/sdk";

const sdk = useSDK();

const page = ref<"Import" | "Docs">("Import");
const items = [
  {
    label: "Import",
    command: () => {
      page.value = "Import";
    },
  },
  {
    label: "Docs",
    command: () => {
      page.value = "Docs";
    },
  },
];

const showRequestSelection = ref(false);
const showAuthentication = ref(false);
const showEnvironment = ref(false);
const importResult = ref<any>(null);
const selectedRequests = ref<any[]>([]);
const environmentVariables = ref<any[]>([]);
const environmentName = ref("");
const isProcessing = ref(false);
const processingStep = ref("");

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
    if (sdk.window?.showToast) {
      sdk.window.showToast(`Could not save file: ${error.message}`, {
        variant: "warning",
        duration: 3000,
      });
    }
    return false;
  }
};

const handleFileUploadSuccess = (
  result: any,
  fileContent?: string,
  fileName?: string,
) => {
  if (fileContent && fileName) {
    result.uploadedFileInfo = { content: fileContent, name: fileName };
  }
  handleImportSuccess(result, fileName);
};

const handleImportSuccess = (result: any, fileName?: string) => {
  importResult.value = result;

  if (result.type === "environment") {
    environmentVariables.value = result.variables || [];
    environmentName.value = result.environmentName || "Unknown";

    if (fileName) {
      const lastDotIndex = fileName.lastIndexOf(".");
      const fileNameWithoutExt =
        lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
      result.savedFileName = fileNameWithoutExt;
    }

    showEnvironment.value = true;
    return;
  }

  showRequestSelection.value = true;
};

const handleImportError = (error: string) => {
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast("Import failed: " + error, {
      variant: "error",
      duration: 5000,
    });
  }
};

const handleRequestsSelected = (requests: any[]) => {
  selectedRequests.value = requests;
  showRequestSelection.value = false;
  showAuthentication.value = true;
};

const handleSelectionCancelled = () => {
  showRequestSelection.value = false;
  importResult.value = null;
  selectedRequests.value = [];
};

const handleEnvironmentSelectionCancelled = () => {
  showEnvironment.value = false;
  importResult.value = null;
  environmentVariables.value = [];
  environmentName.value = "";
};

const handleVariablesSelected = async (
  selectedVariables: any[],
  envName: string,
) => {
  isProcessing.value = true;
  processingStep.value = "Creating new environment...";
  showEnvironment.value = false;

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

  try {
    const result = await sdk.backend.createEnvironmentVariables(
      selectedVariables,
      uniqueEnvironmentName,
    );

    if (result.success) {
      const message = `Successfully created environment "${uniqueEnvironmentName}" with ${(result as any).variablesCreated} variables!`;
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(message, {
          variant: "success",
          duration: 4000,
        });
      }

      if (importResult.value?.uploadedFileInfo) {
        await saveFileToUserFiles(
          importResult.value.uploadedFileInfo.name,
          importResult.value.uploadedFileInfo.content,
        );
      }
    } else {
      const errorMessage =
        result.message || result.error || "No variables were created";
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(`Environment creation failed: ${errorMessage}`, {
          variant: "error",
          duration: 5000,
        });
      }
    }
  } catch (error: any) {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast("Unexpected error: " + error.message, {
        variant: "error",
        duration: 5000,
      });
    }
  } finally {
    isProcessing.value = false;
    processingStep.value = "";
  }
};

const handleAuthConfigured = async (authConfig: any) => {
  isProcessing.value = true;
  processingStep.value = "Processing requests...";

  try {
    const result = await sdk.backend.createSessionsFromRequests(
      selectedRequests.value,
      importResult.value.collectionName,
      authConfig,
    );

    if (result.success && result.processedRequests) {
      processingStep.value = "Creating replay sessions...";
      const createdCount = await createReplaySessionsInFrontend(
        result.processedRequests,
        result.collectionName,
      );

      const message = `Successfully created ${createdCount} replay sessions!`;
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(message, {
          variant: "success",
          duration: 4000,
        });
      }

      if (importResult.value?.uploadedFileInfo) {
        await saveFileToUserFiles(
          importResult.value.uploadedFileInfo.name,
          importResult.value.uploadedFileInfo.content,
        );
      }
    } else {
      const errorMessage = result.message || "Failed to process requests";
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(`Request processing failed: ${errorMessage}`, {
          variant: "error",
          duration: 5000,
        });
      }
    }
  } catch (error: any) {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast("Unexpected error: " + error.message, {
        variant: "error",
        duration: 5000,
      });
    }
  } finally {
    isProcessing.value = false;
    processingStep.value = "";
  }
};

const handleAuthSkipped = async (authConfig?: any) => {
  isProcessing.value = true;
  processingStep.value = "Processing requests...";

  try {
    const result = await sdk.backend.createSessionsFromRequests(
      selectedRequests.value,
      importResult.value.collectionName,
      authConfig || { type: "none" },
    );

    if (result.success && result.processedRequests) {
      processingStep.value = "Creating replay sessions...";
      const createdCount = await createReplaySessionsInFrontend(
        result.processedRequests,
        result.collectionName,
      );

      const message = `Successfully created ${createdCount} replay sessions!`;
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(message, {
          variant: "success",
          duration: 4000,
        });
      }

      if (importResult.value?.uploadedFileInfo) {
        await saveFileToUserFiles(
          importResult.value.uploadedFileInfo.name,
          importResult.value.uploadedFileInfo.content,
        );
      }
    } else {
      const errorMessage = result.message || "Failed to process requests";
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(`Request processing failed: ${errorMessage}`, {
          variant: "error",
          duration: 5000,
        });
      }
    }
  } catch (error: any) {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast("Unexpected error: " + error.message, {
        variant: "error",
        duration: 5000,
      });
    }
  } finally {
    isProcessing.value = false;
    processingStep.value = "";
  }
};

const createReplaySessionsInFrontend = async (
  processedRequests: Array<{
    request: any;
    spec: any;
    sessionName: string;
  }>,
  collectionName: string,
): Promise<number> => {
  try {
    const collections = sdk.replay.getCollections();
    let finalCollectionName = collectionName;
    let targetCollectionId = collections.find(
      (c: any) => c.name === finalCollectionName,
    )?.id;

    if (targetCollectionId) {
      let counter = 1;
      do {
        finalCollectionName = `${collectionName}${counter}`;
        targetCollectionId = collections.find(
          (c: any) => c.name === finalCollectionName,
        )?.id;
        counter++;
      } while (targetCollectionId && counter < 100);
    }

    const createCollectionResult =
      await sdk.graphql.createReplaySessionCollection({
        input: {
          name: finalCollectionName,
        },
      });

    if (!createCollectionResult.createReplaySessionCollection?.collection?.id) {
      throw new Error("Failed to create collection: No collection ID returned");
    }

    targetCollectionId =
      createCollectionResult.createReplaySessionCollection.collection.id;

    let createdCount = 0;
    const sessionErrors: string[] = [];

    const processSession = async (
      spec: any,
      sessionName: string,
      index: number,
    ): Promise<void> => {
      try {
        const createSessionResult = await sdk.graphql.createReplaySession({
          input: {
            requestSource: {
              raw: {
                raw: buildRawRequest(spec),
                connectionInfo: {
                  host: spec.host || "example.com",
                  port: spec.port || (spec.tls !== false ? 443 : 80),
                  isTLS: spec.tls !== false,
                },
              },
            },
          },
        });

        const sessionId = createSessionResult.createReplaySession?.session?.id;
        if (!sessionId) {
          const errorMsg = "Failed to get session ID after creation";
          sessionErrors.push(`Session ${index + 1}: ${errorMsg}`);
          return;
        }

        try {
          await (sdk.replay as any).moveSession(sessionId, targetCollectionId);
        } catch (moveError: any) {
          sessionErrors.push(`Session ${index + 1} move: ${moveError.message}`);
        }

        try {
          await sdk.graphql.renameReplaySession({
            id: sessionId,
            name: sessionName,
          });
        } catch (renameError: any) {
          sessionErrors.push(
            `Session ${index + 1} rename: ${renameError.message}`,
          );
        }

        createdCount++;
      } catch (sessionError: any) {
        sessionErrors.push(`Session ${index + 1}: ${sessionError.message}`);
      }
    };

    const batchSize = 5;
    for (let i = 0; i < processedRequests.length; i += batchSize) {
      const batch = processedRequests.slice(i, i + batchSize);

      const batchPromises = batch.map((item, batchIndex) =>
        processSession(item.spec, item.sessionName, i + batchIndex),
      );

      try {
        // eslint-disable-next-line compat/compat
        await Promise.all(batchPromises);
      } catch (batchError: any) {
        console.warn(
          "Batch processing error (continuing):",
          batchError.message,
        );
      }

      if (i + batchSize < processedRequests.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (sessionErrors.length > 0) {
      console.warn("Some sessions failed to create:", sessionErrors);

      if (sdk.window?.showToast) {
        sdk.window.showToast(
          `${createdCount}/${processedRequests.length} sessions created successfully. Check console for details on failed sessions.`,
          { variant: "warning", duration: 6000 },
        );
      }
    }

    return createdCount;
  } catch (error: any) {
    throw new Error(`Session creation failed: ${error.message}`);
  }
};

const buildRawRequest = (spec: any): string => {
  try {
    const method = spec.method || "GET";
    const host = spec.host || "example.com";
    const port = spec.port || (spec.tls ? 443 : 80);
    const path = spec.path || "/";
    const query = spec.query || "";
    const headers = spec.headers || {};
    const body = spec.body || "";
    const isTls = spec.tls !== false;

    const fullPath = path + query;
    let request = `${method} ${fullPath} HTTP/1.1\r\n`;

    if ((isTls && port !== 443) || (!isTls && port !== 80)) {
      request += `Host: ${host}:${port}\r\n`;
    } else {
      request += `Host: ${host}\r\n`;
    }

    for (const [name, value] of Object.entries(headers)) {
      if (name && value && name.toLowerCase() !== "host") {
        request += `${name}: ${value}\r\n`;
      }
    }

    if (body && typeof body === "string" && body.length > 0) {
      request += `Content-Length: ${body.length}\r\n`;
    }

    request += "\r\n";

    if (body && typeof body === "string" && body.length > 0) {
      request += body;
    }

    return request;
  } catch (error) {
    console.error("Error building raw request:", error);
    const method = spec?.method || "GET";
    const path = spec?.path || "/";
    const host = spec?.host || "example.com";
    return `${method} ${path} HTTP/1.1\r\nHost: ${host}\r\n\r\n`;
  }
};
</script>

<template>
  <div class="h-full flex flex-col gap-1">
    <MenuBar breakpoint="320px">
      <template #start>
        <div class="flex">
          <div class="px-3 py-2 font-bold text-gray-300">ReDocs</div>
          <div
            v-for="(item, index) in items"
            :key="index"
            class="px-3 py-2 cursor-pointer text-gray-300 rounded transition-all duration-200 ease-in-out"
            :class="{
              'bg-zinc-800/40': page === item.label,
              'hover:bg-gray-800/10': page !== item.label,
            }"
            @mousedown="item.command"
          >
            {{ item.label }}
          </div>
        </div>
      </template>

      <template #end>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-sm text-gray-400">
            Import API docs as Caido Replay sessions
          </span>
        </div>
      </template>
    </MenuBar>

    <div class="flex-1 min-h-0">
      <!-- Import Page -->
      <div v-if="page === 'Import'" class="h-full p-4">
        <div
          v-if="isProcessing"
          class="text-center p-4 bg-primary-900 rounded-lg mb-4"
        >
          <p class="text-secondary-400">{{ processingStep }}</p>
        </div>
        <FileUploadArea
          :disabled="isProcessing"
          @import-success="handleFileUploadSuccess"
          @import-error="handleImportError"
        />
      </div>

      <DocumentationTab v-else-if="page === 'Docs'" />
    </div>

    <RequestSelectionModal
      v-if="importResult"
      :visible="showRequestSelection"
      :requests="importResult.requests || []"
      :collection-name="importResult.collectionName || 'Unknown'"
      :collection-type="importResult.type || 'unknown'"
      @update:visible="showRequestSelection = $event"
      @requests-selected="handleRequestsSelected"
      @selection-cancelled="handleSelectionCancelled"
    />

    <EnvironmentModal
      v-if="importResult && importResult.type === 'environment'"
      :visible="showEnvironment"
      :variables="environmentVariables"
      :environment-name="environmentName"
      @update:visible="showEnvironment = $event"
      @variables-selected="handleVariablesSelected"
      @selection-cancelled="handleEnvironmentSelectionCancelled"
    />

    <AuthenticationModal
      v-if="importResult && selectedRequests.length > 0"
      :visible="showAuthentication"
      :auth-info="
        importResult.authentication || {
          hasAuth: false,
          authType: 'none',
          description: 'No authentication detected',
        }
      "
      :collection-name="importResult.collectionName || 'Unknown'"
      :request-count="selectedRequests.length"
      @update:visible="showAuthentication = $event"
      @auth-configured="handleAuthConfigured"
      @auth-skipped="handleAuthSkipped"
    />
  </div>
</template>
