<script setup lang="ts">
import FileUpload from "primevue/fileupload";
import { computed, ref } from "vue";

import { useSDK } from "../../plugins/sdk";

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "import-success": [result: any, fileContent?: string, fileName?: string];
  "import-error": [error: string];
}>();

const sdk = useSDK();

const isUploading = ref(false);
const uploadProgress = ref(0);
const dragOverCount = ref(0);
const selectedFile = ref<File | undefined>(undefined);

const isDragOver = computed(() => dragOverCount.value > 0);
const supportedFormats = computed(() => [
  "Postman Collection (.json)",
  "OpenAPI Specification (.json only)",
  "Postman Environment (.json)",
]);

const onFileSelect = async (event: any) => {
  if (props.disabled) return;

  const files = event.files || event.target.files;
  if (files && files.length > 0) {
    selectedFile.value = files[0];
    processFile(files[0]);
  }
};

const isFileSupported = (file: File): boolean => {
  const supportedExtensions = [".json"];
  const fileExtension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."));
  return supportedExtensions.includes(fileExtension);
};

const processFile = async (file: File) => {
  if (!isFileSupported(file)) {
    emit(
      "import-error",
      `Unsupported file type. Please upload ${supportedFormats.value.join(" or ")}.`,
    );
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast(`Processing File: Analyzing ${file.name}...`, {
        variant: "info",
      });
    }

    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10;
      }
    }, 200);

    const fileContent = await file.text();

    if (!sdk.backend || !sdk.backend.processImportFile) {
      throw new Error("Backend processImportFile function not available");
    }

    const result = await sdk.backend.processImportFile(fileContent, file.name);

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    setTimeout(() => {
      isUploading.value = false;
      uploadProgress.value = 0;
      selectedFile.value = undefined;

      if (result?.success) {
        emit("import-success", result, fileContent, file.name);
      } else {
        const errorMsg =
          result?.message ||
          "Failed to process file. Please check the file format and try again.";
        emit("import-error", errorMsg);
      }
    }, 500);
  } catch (error) {
    isUploading.value = false;
    uploadProgress.value = 0;
    selectedFile.value = undefined;

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during file processing.";
    emit("import-error", errorMessage);
  }
};

const onDragEnter = (event: DragEvent) => {
  if (props.disabled) return;
  event.preventDefault();
  dragOverCount.value++;
};

const onDragLeave = (event: DragEvent) => {
  event.preventDefault();
  dragOverCount.value = Math.max(0, dragOverCount.value - 1);
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = "copy";
};

const onDrop = (event: DragEvent) => {
  if (props.disabled) return;
  event.preventDefault();
  dragOverCount.value = 0;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file) {
      selectedFile.value = file;
      processFile(file);
    }
  }
};

const onUploadAreaClick = () => {
  if (!isUploading.value && !props.disabled) {
    const fileInput = document.querySelector(
      ".upload-file-input",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
};
</script>

<template>
  <div class="w-full h-full">
    <div
      class="relative w-full h-full border-2 border-dashed border-surface-600 rounded-xl cursor-pointer transition-all duration-200 bg-surface-900"
      :class="{
        'border-primary-500 bg-primary-900/20 scale-[1.02]': isDragOver,
        'border-primary-500 bg-primary-900/20': isUploading,
        'opacity-50 cursor-not-allowed': props.disabled,
      }"
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @dragover="onDragOver"
      @drop="onDrop"
      @click="onUploadAreaClick"
    >
      <div
        v-if="!isUploading"
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
            @select="onFileSelect"
          />
        </div>
      </div>

      <div v-else class="flex items-center justify-center h-full p-6">
        <div class="text-center max-w-md">
          <i class="fas fa-file-import text-4xl text-secondary-400 mb-4"></i>
          <h3 class="text-lg font-semibold text-white mb-2">
            Processing {{ selectedFile?.name }}
          </h3>
          <p class="text-surface-300 mb-4 font-medium">
            Reading and parsing file...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
