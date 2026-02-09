<script setup lang="ts">
import FileUpload from "primevue/fileupload";
import { computed } from "vue";

import { useSDK } from "../../plugins/sdk";
import type { ImportResult } from "../../types/index";

import { supportedFormats, useFileUpload } from "./useFileUpload";

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "import-success": [
    result: ImportResult,
    fileContent?: string,
    fileName?: string,
  ];
  "import-error": [error: string];
}>();

const sdk = useSDK();

const upload = useFileUpload(
  sdk,
  () => props.disabled === true,
  (result, fileContent, fileName) =>
    emit("import-success", result as ImportResult, fileContent, fileName),
  (error) => emit("import-error", error),
);

const isDragOver = computed(() => upload.isDragOver());
</script>

<template>
  <div class="w-full h-full">
    <div
      class="relative w-full h-full border-2 border-dashed border-surface-600 rounded-xl cursor-pointer transition-all duration-200 bg-surface-900"
      :class="{
        'border-primary-500 bg-primary-900/20 scale-[1.02]': isDragOver,
        'border-primary-500 bg-primary-900/20': upload.isUploading.value,
        'opacity-50 cursor-not-allowed': props.disabled,
      }"
      @dragenter="upload.onDragEnter"
      @dragleave="upload.onDragLeave"
      @dragover="upload.onDragOver"
      @drop="upload.onDrop"
      @click="upload.openFilePicker"
    >
      <div
        v-if="!upload.isUploading.value"
        class="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <div class="mb-6 opacity-90">
          <i class="fas fa-cloud-upload-alt text-6xl text-secondary-400"></i>
        </div>

        <div class="max-w-xl w-full">
          <h3 class="text-3xl font-bold text-white mb-4">
            Import Your API Documentation
          </h3>
          <p class="text-xl text-surface-300 mb-6 font-medium">
            Drag and drop your file here, or click to browse
          </p>

          <div class="text-left mb-6">
            <div class="flex items-center gap-2 mb-3">
              <i class="fas fa-file-code text-secondary-400"></i>
              <p class="text-lg font-bold text-white">Supported formats:</p>
            </div>
            <div class="flex flex-col gap-3">
              <div
                v-for="format in supportedFormats"
                :key="format"
                class="flex items-center gap-3 text-white p-3 rounded-lg bg-surface-800 border border-surface-700 transition-all hover:bg-surface-700 hover:border-surface-600 hover:-translate-y-0.5"
              >
                <i class="fas fa-check text-secondary-400"></i>
                <span class="text-base font-medium">{{ format }}</span>
              </div>
            </div>
          </div>

          <FileUpload
            mode="basic"
            name="importFile"
            accept=".json"
            :multiple="false"
            :auto="false"
            choose-label="Choose File"
            class="upload-file-input"
            :pt="{
              chooseButton: {
                class:
                  'bg-white border-2 border-white text-gray-700 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:bg-gray-50 hover:-translate-y-0.5 transition-all',
              },
            }"
            @select="upload.onFileSelect"
          />
        </div>
      </div>

      <div v-else class="flex items-center justify-center h-full p-6">
        <div class="text-center max-w-md">
          <i class="fas fa-file-import text-4xl text-secondary-400 mb-4"></i>
          <h3 class="text-lg font-semibold text-white mb-2">
            Processing {{ upload.selectedFile.value?.name }}
          </h3>
          <p class="text-surface-300 mb-4 font-medium">
            Reading and parsing file...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
