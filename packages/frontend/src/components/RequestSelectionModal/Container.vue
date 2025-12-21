<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  visible: boolean;
  requests: Array<any>;
  collectionName: string;
  collectionType: "postman" | "openapi";
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "requests-selected": [selectedRequests: Array<any>];
  "selection-cancelled": [];
}>();

const selectedRequests = ref<Set<string>>(new Set());

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const tableData = computed(() => {
  const currentSelection = selectedRequests.value;
  const usedIds = new Set<string>();

  return props.requests.map((request, index) => {
    let requestId =
      request.id || `req_${index}_${request.method}_${request.url}`;

    let counter = 0;
    let originalId = requestId;
    while (usedIds.has(requestId)) {
      counter++;
      requestId = `${originalId}_${counter}`;
    }
    usedIds.add(requestId);

    return {
      id: requestId,
      name: request.name || `${request.method} ${getPathFromUrl(request.url)}`,
      method: request.method?.toUpperCase() || "GET",
      path: getPathFromUrl(request.url),
      url: request.url,
      request: request,
      selected: currentSelection.has(requestId),
    };
  });
});

const selectedCount = computed(() => selectedRequests.value.size);
const totalCount = computed(() => props.requests.length);

const selectAll = computed({
  get: () => {
    const tableItems = tableData.value;
    const selection = selectedRequests.value;
    return (
      tableItems.length > 0 &&
      tableItems.every((item) => selection.has(item.id))
    );
  },
  set: (value: boolean) => {
    const tableItems = tableData.value;
    if (value) {
      const newSelection = new Set<string>();
      tableItems.forEach((item) => {
        newSelection.add(item.id);
      });
      selectedRequests.value = newSelection;
    } else {
      selectedRequests.value = new Set();
    }
  },
});

const getPathFromUrl = (url: string): string => {
  if (!url) return "/";

  try {
    if (url.includes("{{") && url.includes("}}")) {
      const templateEnd = url.lastIndexOf("}}");
      if (templateEnd !== -1) {
        let pathAfterTemplate = url.substring(templateEnd + 2);
        if (!pathAfterTemplate.startsWith("/")) {
          pathAfterTemplate = "/" + pathAfterTemplate;
        }
        return pathAfterTemplate;
      }
    }

    if (url.includes("://")) {
      const urlParts = url.split("://");
      if (urlParts.length > 1 && urlParts[1]) {
        const afterProtocol = urlParts[1];
        const firstSlash = afterProtocol.indexOf("/");
        if (firstSlash !== -1) {
          return afterProtocol.substring(firstSlash);
        } else {
          return "/";
        }
      }
    }

    if (url.startsWith("/")) {
      return url;
    }

    return "/" + url;
  } catch (error) {
    return url;
  }
};

watch(
  () => props.requests,
  (newRequests) => {
    if (newRequests && newRequests.length > 0) {
      const usedIds = new Set<string>();
      const newSelection = new Set<string>();

      newRequests.forEach((request, index) => {
        let requestId =
          request.id || `req_${index}_${request.method}_${request.url}`;

        let counter = 0;
        let originalId = requestId;
        while (usedIds.has(requestId)) {
          counter++;
          requestId = `${originalId}_${counter}`;
        }
        usedIds.add(requestId);
        newSelection.add(requestId);
      });

      selectedRequests.value = newSelection;
    }
  },
  { immediate: true },
);

const handleRequestSelection = (requestId: string, selected: boolean | any) => {
  const newSelection = new Set(selectedRequests.value);

  if (selected) {
    newSelection.add(requestId);
  } else {
    newSelection.delete(requestId);
  }

  selectedRequests.value = newSelection;
};

const handleRowClick = (rowData: any) => {
  const isSelected = selectedRequests.value.has(rowData.id);
  handleRequestSelection(rowData.id, !isSelected);
};

const handleContinue = () => {
  const tableItems = tableData.value;
  const selected = tableItems
    .filter((item) => selectedRequests.value.has(item.id))
    .map((item) => item.request);

  emit("requests-selected", selected);
  closeModal();
};

const handleCancel = () => {
  emit("selection-cancelled");
  closeModal();
};

const closeModal = () => {
  dialogVisible.value = false;
};

const getMethodBadgeClass = (method: string) => {
  const baseClasses = "px-3 py-1.5 text-xs font-bold rounded-md border";

  switch (method.toUpperCase()) {
    case "GET":
      return `${baseClasses} bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800`;
    case "POST":
      return `${baseClasses} bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800`;
    case "PUT":
      return `${baseClasses} bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800`;
    case "PATCH":
      return `${baseClasses} bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800`;
    case "DELETE":
      return `${baseClasses} bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`;
    default:
      return `${baseClasses} bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800`;
  }
};
</script>

<template>
  <Dialog
    :visible="dialogVisible"
    modal
    :style="{
      width: '90vw',
      maxWidth: '1000px',
      height: 'auto',
      maxHeight: '80vh',
    }"
    :draggable="false"
    class="request-selection-modal"
    :breakpoints="{ '960px': '98vw' }"
    @update:visible="dialogVisible = $event"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="fas fa-list text-xl text-secondary-400"></i>
        <span class="text-lg font-semibold">Select Requests to Import</span>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <Card>
        <template #content>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fas fa-file-import text-secondary-400"></i>
              <div>
                <h3 class="font-semibold text-surface-900 dark:text-surface-0">
                  {{ collectionName }}
                </h3>
                <p
                  class="text-sm font-medium text-surface-600 dark:text-surface-300"
                >
                  {{ totalCount }}
                  {{ collectionType === "postman" ? "Postman" : "OpenAPI" }}
                  requests found
                </p>
              </div>
            </div>

            <div class="text-right">
              <p
                class="text-sm font-medium text-surface-900 dark:text-surface-0"
              >
                {{ selectedCount }} of {{ totalCount }} selected
              </p>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="fas fa-table text-secondary-400"></i>
              <span>Available Requests</span>
            </div>

            <div class="flex items-center gap-2">
              <Checkbox
                v-model="selectAll"
                binary
                class="select-all-checkbox"
              />
              <label
                class="text-sm font-medium text-surface-900 dark:text-surface-0 cursor-pointer"
                @click="selectAll = !selectAll"
              >
                {{ selectAll ? "Unselect All" : "Select All" }}
              </label>
            </div>
          </div>
        </template>
        <template #content>
          <div class="rounded-md overflow-hidden border border-surface-600">
            <DataTable
              :value="tableData"
              scrollable
              scroll-height="400px"
              :rows="50"
              class="request-selection-table"
              striped-rows
              size="small"
            >
              <Column header="" :style="{ width: '60px' }">
                <template #body="{ data }">
                  <div class="flex justify-center" @click.stop>
                    <Checkbox
                      :model-value="data.selected"
                      binary
                      @update:model-value="
                        (value) => handleRequestSelection(data.id, value)
                      "
                    />
                  </div>
                </template>
              </Column>

              <Column header="Method" :style="{ width: '100px' }">
                <template #body="{ data }">
                  <div class="cursor-pointer" @click="handleRowClick(data)">
                    <span :class="getMethodBadgeClass(data.method)">
                      {{ data.method }}
                    </span>
                  </div>
                </template>
              </Column>

              <Column header="Path" field="path" :style="{ minWidth: '200px' }">
                <template #body="{ data }">
                  <div class="cursor-pointer" @click="handleRowClick(data)">
                    <code
                      class="text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded"
                    >
                      {{ data.path }}
                    </code>
                  </div>
                </template>
              </Column>

              <Column header="Name" field="name" :style="{ minWidth: '250px' }">
                <template #body="{ data }">
                  <div class="cursor-pointer" @click="handleRowClick(data)">
                    <span class="text-sm text-surface-900 dark:text-surface-0">
                      {{ data.name }}
                    </span>
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </Card>
    </div>

    <template #footer>
      <div class="flex justify-between items-center px-6 py-4">
        <span class="text-sm text-surface-600 dark:text-surface-300 pr-4">
          {{ selectedCount }} requests will be imported
        </span>
        <Button
          label="Cancel Import"
          severity="secondary"
          class="flex items-center gap-2 mr-4"
          @click="handleCancel"
        >
          <template #icon><i class="fas fa-times"></i></template>
        </Button>

        <div class="flex items-center gap-6">
          <Button
            label="Continue to Authentication"
            :disabled="selectedCount === 0"
            class="flex items-center gap-2"
            @click="handleContinue"
          >
            <template #icon><i class="fas fa-arrow-right"></i></template>
          </Button>
        </div>
      </div>
    </template>
  </Dialog>
</template>
