<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import { computed } from "vue";

import type { CollectionSourceType, ImportedRequest } from "../../types/index";
import { collectionTypeToLabel } from "../../types/index";

import { getMethodBadgeClass, useRequestTable } from "./useRequestTable";

const props = defineProps<{
  visible: boolean;
  requests: ImportedRequest[];
  collectionName: string;
  collectionType: CollectionSourceType;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "requests-selected": [selectedRequests: ImportedRequest[]];
  "selection-cancelled": [];
}>();

const table = useRequestTable(
  () => props.requests,
  (selected) => emit("requests-selected", selected),
  () => emit("selection-cancelled"),
  () => emit("update:visible", false),
);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const tableRows = computed(() => {
  const refOrArray = table.tableData;
  const value =
    typeof refOrArray === "object" &&
    refOrArray !== null &&
    "value" in refOrArray
      ? (refOrArray as { value: unknown }).value
      : refOrArray;
  return Array.isArray(value) ? value : [];
});

const unwrap = (r: unknown): boolean => {
  if (r !== undefined && r !== null && typeof r === "object" && "value" in r) {
    return (r as { value: boolean }).value;
  }
  return Boolean(r);
};

const selectAllChecked = computed({
  get: () => unwrap(table.selectAll),
  set: (v: boolean) => {
    const ref = table.selectAll as { value: boolean };
    if (ref !== undefined && ref !== null && "value" in ref) {
      ref.value = v;
    }
  },
});

const isContinueDisabledValue = computed(() =>
  unwrap(table.isContinueDisabled),
);

const unwrapNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (v !== undefined && v !== null && typeof v === "object" && "value" in v) {
    const val = (v as { value: number }).value;
    return typeof val === "number" ? val : 0;
  }
  return 0;
};

const selectedCountValue = computed(() => unwrapNumber(table.selectedCount));
const totalCountValue = computed(() => unwrapNumber(table.totalCount));
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
                  {{ totalCountValue }}
                  {{ collectionTypeToLabel(collectionType) }}
                  requests found
                </p>
              </div>
            </div>

            <div class="text-right">
              <p
                class="text-sm font-medium text-surface-900 dark:text-surface-0"
              >
                {{ selectedCountValue }} of {{ totalCountValue }} selected
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
                v-model="selectAllChecked"
                binary
                class="select-all-checkbox"
              />
              <label
                class="text-sm font-medium text-surface-900 dark:text-surface-0 cursor-pointer"
                @click="table.toggleSelectAll()"
              >
                {{ selectAllChecked ? "Unselect All" : "Select All" }}
              </label>
            </div>
          </div>
        </template>
        <template #content>
          <div class="rounded-md overflow-hidden border border-surface-600">
            <DataTable
              :value="tableRows"
              data-key="id"
              scrollable
              scroll-height="400px"
              :rows="50"
              class="request-selection-table"
              striped-rows
              size="small"
            >
              <Column header="" :style="{ width: '60px' }">
                <template #body="{ data }">
                  <div v-if="data" class="flex justify-center" @click.stop>
                    <Checkbox
                      :model-value="data.selected"
                      binary
                      @update:model-value="
                        (value) => table.handleRequestSelection(data.id, value)
                      "
                    />
                  </div>
                </template>
              </Column>

              <Column header="Method" :style="{ width: '100px' }">
                <template #body="{ data }">
                  <div
                    v-if="data"
                    class="cursor-pointer"
                    @click="table.handleRowClick(data)"
                  >
                    <span :class="getMethodBadgeClass(data.method)">
                      {{ data.method }}
                    </span>
                  </div>
                </template>
              </Column>

              <Column header="Path" field="path" :style="{ minWidth: '200px' }">
                <template #body="{ data }">
                  <div
                    v-if="data"
                    class="cursor-pointer"
                    @click="table.handleRowClick(data)"
                  >
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
                  <div
                    v-if="data"
                    class="cursor-pointer"
                    @click="table.handleRowClick(data)"
                  >
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
          {{ selectedCountValue }} requests will be imported
        </span>
        <Button
          label="Cancel Import"
          severity="secondary"
          class="flex items-center gap-2 mr-4"
          @click="table.handleCancel"
        >
          <template #icon><i class="fas fa-times"></i></template>
        </Button>

        <div class="flex items-center gap-6">
          <Button
            label="Continue to Authentication"
            :disabled="isContinueDisabledValue"
            class="flex items-center gap-2"
            @click="table.handleContinue"
          >
            <template #icon><i class="fas fa-arrow-right"></i></template>
          </Button>
        </div>
      </div>
    </template>
  </Dialog>
</template>
