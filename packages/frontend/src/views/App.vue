<script setup lang="ts">
import MenuBar from "primevue/menubar";
import { computed, ref } from "vue";

import { AuthenticationModal } from "../components/AuthenticationModal";
import { DocumentationTab } from "../components/DocumentationTab";
import { EnvironmentModal } from "../components/EnvironmentModal";
import { FileUploadArea } from "../components/FileUploadArea";
import { RequestSelectionModal } from "../components/RequestSelectionModal";
import { useEnvironmentCreation, useRequestProcessing } from "../composables";
import { useSDK } from "../plugins/sdk";
import type {
  AuthConfig,
  EnvironmentVariable,
  ImportedRequest,
  ImportResult,
  PageType,
} from "../types/";

const sdk = useSDK();

const page = ref<PageType>("Import");
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
const importResult = ref<ImportResult | undefined>(undefined);
const selectedRequests = ref<ImportedRequest[]>([]);
const environmentVariables = ref<EnvironmentVariable[]>([]);
const environmentName = ref("");

const environmentCreation = useEnvironmentCreation(sdk);
const requestProcessing = useRequestProcessing(sdk);

const collectionRequests = computed((): ImportedRequest[] => {
  const raw = importResult.value?.requests;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is ImportedRequest =>
      r !== undefined && r !== null && typeof r === "object",
  );
});
const collectionType = computed(
  () => (importResult.value?.type ?? "openapi") as "postman" | "openapi",
);

const environmentVariablesList = computed((): EnvironmentVariable[] => {
  const raw = environmentVariables.value;
  if (raw === undefined || raw === null || !Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is EnvironmentVariable =>
      v !== undefined &&
      v !== null &&
      typeof v === "object" &&
      "key" in v &&
      "value" in v,
  );
});

const isProcessing = computed(
  () =>
    environmentCreation.isCreating.value ||
    requestProcessing.isProcessing.value,
);
const processingStep = computed(
  () =>
    environmentCreation.creationStep.value ||
    requestProcessing.processingStep.value,
);

const handleFileUploadSuccess = (
  result: ImportResult,
  fileContent?: string,
  fileName?: string,
) => {
  if (fileContent && fileName) {
    result.uploadedFileInfo = { content: fileContent, name: fileName };
  }
  handleImportSuccess(result, fileName);
};

const handleImportSuccess = (result: ImportResult, fileName?: string) => {
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
  sdk.window.showToast("Import failed: " + error, {
    variant: "error",
    duration: 5000,
  });
};

const handleRequestsSelected = (requests: ImportedRequest[]) => {
  selectedRequests.value = requests;
  showRequestSelection.value = false;
  showAuthentication.value = true;
};

const handleSelectionCancelled = () => {
  showRequestSelection.value = false;
  importResult.value = undefined;
  selectedRequests.value = [];
};

const handleEnvironmentSelectionCancelled = () => {
  showEnvironment.value = false;
  importResult.value = undefined;
  environmentVariables.value = [];
  environmentName.value = "";
};

const handleVariablesSelected = async (
  selectedVariables: EnvironmentVariable[],
  envName: string,
) => {
  showEnvironment.value = false;
  await environmentCreation.createEnvironment(
    selectedVariables,
    envName,
    importResult.value?.uploadedFileInfo,
  );
};

const handleAuthConfigured = async (authConfig: AuthConfig) => {
  showAuthentication.value = false;
  await requestProcessing.processRequests(
    selectedRequests.value,
    importResult.value?.collectionName || "Unknown",
    authConfig,
    importResult.value?.uploadedFileInfo,
  );
};

const handleAuthSkipped = async (authConfig?: AuthConfig) => {
  showAuthentication.value = false;
  await requestProcessing.processRequests(
    selectedRequests.value,
    importResult.value?.collectionName || "Unknown",
    authConfig || { type: "none" },
    importResult.value?.uploadedFileInfo,
  );
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
      v-if="importResult && importResult.type !== 'environment'"
      :visible="showRequestSelection"
      :requests="collectionRequests"
      :collection-name="importResult.collectionName || 'Unknown'"
      :collection-type="collectionType"
      @update:visible="showRequestSelection = $event"
      @requests-selected="handleRequestsSelected"
      @selection-cancelled="handleSelectionCancelled"
    />

    <EnvironmentModal
      v-if="importResult && importResult.type === 'environment'"
      :visible="showEnvironment"
      :variables="environmentVariablesList"
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
