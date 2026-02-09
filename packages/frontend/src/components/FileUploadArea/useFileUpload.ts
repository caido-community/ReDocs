import { ref } from "vue";

import type { FrontendSDK } from "../../types.js";

const SUPPORTED_EXTENSIONS = [".json"];

export const supportedFormats = [
  "Postman Collection (.json)",
  "OpenAPI Specification (.json only)",
  "Postman Environment (.json)",
];

const isFileSupported = (file: File): boolean => {
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
  return SUPPORTED_EXTENSIONS.includes(ext);
};

export const useFileUpload = (
  sdk: FrontendSDK,
  disabled: () => boolean,
  onSuccess: (result: unknown, fileContent?: string, fileName?: string) => void,
  onError: (error: string) => void,
) => {
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const dragOverCount = ref(0);
  const selectedFile = ref<File | undefined>(undefined);

  const isDragOver = () => dragOverCount.value > 0;

  const processFile = async (file: File) => {
    if (!isFileSupported(file)) {
      onError(
        `Unsupported file type. Please upload ${supportedFormats.join(" or ")}.`,
      );
      return;
    }

    isUploading.value = true;
    uploadProgress.value = 0;

    sdk.window.showToast(`Processing File: Analyzing ${file.name}...`, {
      variant: "info",
    });

    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10;
      }
    }, 200);

    try {
      const fileContent = await file.text();
      const result = await sdk.backend.processImportFile(
        fileContent,
        file.name,
      );

      clearInterval(progressInterval);
      uploadProgress.value = 100;

      setTimeout(() => {
        isUploading.value = false;
        uploadProgress.value = 0;
        selectedFile.value = undefined;

        if (result?.success) {
          onSuccess(result, fileContent, file.name);
        } else {
          const errorMsg =
            result?.message ??
            "Failed to process file. Please check the file format and try again.";
          onError(errorMsg);
        }
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      isUploading.value = false;
      uploadProgress.value = 0;
      selectedFile.value = undefined;
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during file processing.";
      onError(message);
    }
  };

  const onFileSelect = async (event: {
    files?: File[];
    target?: { files?: FileList };
  }) => {
    if (disabled()) return;

    const files = event.files ?? event.target?.files;
    if (files !== undefined && files.length > 0) {
      const file = files[0];
      if (file !== undefined) {
        selectedFile.value = file;
        await processFile(file);
      }
    }
  };

  const onDragEnter = () => {
    if (disabled()) return;
    dragOverCount.value++;
  };

  const onDragLeave = () => {
    dragOverCount.value = Math.max(0, dragOverCount.value - 1);
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const onDrop = (event: DragEvent) => {
    if (disabled()) return;
    event.preventDefault();
    dragOverCount.value = 0;

    const files = event.dataTransfer?.files;
    if (files !== undefined && files.length > 0) {
      const file = files[0];
      if (file !== undefined) {
        selectedFile.value = file;
        processFile(file);
      }
    }
  };

  const openFilePicker = () => {
    if (isUploading.value || disabled()) return;
    const input = document.querySelector<HTMLInputElement>(
      ".upload-file-input input[type=file]",
    );
    input?.click();
  };

  return {
    isUploading,
    uploadProgress,
    isDragOver,
    selectedFile,
    onFileSelect,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    openFilePicker,
  };
};
