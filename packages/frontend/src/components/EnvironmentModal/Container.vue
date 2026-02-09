<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import { computed } from "vue";

import type { EnvironmentVariable } from "../../types/index";

import { useEnvironmentTable } from "./useEnvironmentTable";

const props = defineProps<{
  visible: boolean;
  variables: EnvironmentVariable[];
  environmentName: string;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "variables-selected": [
    selectedVariables: EnvironmentVariable[],
    environmentName: string,
  ];
  "selection-cancelled": [];
}>();

const table = useEnvironmentTable(
  () => props.variables,
  () => props.environmentName,
  (selected, envName) => emit("variables-selected", selected, envName),
  () => emit("selection-cancelled"),
  () => emit("update:visible", false),
);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const variableTypeOptions = [
  { label: "Plain Text", value: "plain" },
  { label: "Secret", value: "secret" },
];

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

const selectedCountValue = computed(() => {
  const v = table.selectedCount;
  if (typeof v === "number") return v;
  if (v !== undefined && v !== null && typeof v === "object" && "value" in v) {
    const val = (v as { value: number }).value;
    return typeof val === "number" ? val : 0;
  }
  return 0;
});

const totalCountValue = computed(() => {
  const v = table.totalCount;
  if (typeof v === "number") return v;
  if (v !== undefined && v !== null && typeof v === "object" && "value" in v) {
    const val = (v as { value: number }).value;
    return typeof val === "number" ? val : 0;
  }
  return 0;
});
</script>

<template>
  <Dialog
    :visible="dialogVisible"
    :modal="true"
    :closable="true"
    :style="{
      width: '90vw',
      maxWidth: '1000px',
      height: 'auto',
      maxHeight: '80vh',
    }"
    :draggable="false"
    class="environment-selection-modal"
    :breakpoints="{ '960px': '98vw' }"
    @update:visible="dialogVisible = $event"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="fas fa-cogs text-xl text-secondary-400"></i>
        <span class="text-lg font-semibold">Select Variables to Import</span>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <Card>
        <template #content>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fas fa-layer-group text-secondary-400"></i>
              <div>
                <h3 class="font-semibold text-surface-900 dark:text-surface-0">
                  {{ environmentName }}
                </h3>
                <p
                  class="text-sm font-medium text-surface-600 dark:text-surface-300"
                >
                  {{ totalCountValue }} environment variables found
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
              <span>Available Variables</span>
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
              class="variable-selection-table"
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
                        (value) => table.handleVariableSelection(data.id, value)
                      "
                    />
                  </div>
                </template>
              </Column>

              <Column header="Variable Name" :style="{ minWidth: '200px' }">
                <template #body="{ data }">
                  <div
                    v-if="data"
                    class="cursor-pointer"
                    @click="table.handleRowClick(data)"
                  >
                    <InputText
                      :model-value="data.key"
                      class="w-full"
                      size="small"
                      @update:model-value="
                        (value) => table.updateVariable(data.id, 'key', value)
                      "
                      @click.stop
                    />
                  </div>
                </template>
              </Column>

              <Column header="Value" :style="{ minWidth: '250px' }">
                <template #body="{ data }">
                  <div
                    v-if="data"
                    class="cursor-pointer"
                    @click="table.handleRowClick(data)"
                  >
                    <InputText
                      :model-value="data.value"
                      :type="data.isSecret ? 'password' : 'text'"
                      class="w-full"
                      size="small"
                      placeholder="Enter variable value..."
                      @update:model-value="
                        (value) => table.updateVariable(data.id, 'value', value)
                      "
                      @click.stop
                    />
                  </div>
                </template>
              </Column>

              <Column header="Type" :style="{ width: '140px' }">
                <template #body="{ data }">
                  <div
                    v-if="data"
                    class="cursor-pointer"
                    @click="table.handleRowClick(data)"
                  >
                    <Dropdown
                      :model-value="data.isSecret ? 'secret' : 'plain'"
                      :options="variableTypeOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      size="small"
                      @update:model-value="
                        (value) => table.handleSecretTypeChange(data.id, value)
                      "
                      @click.stop
                    />
                  </div>
                </template>
              </Column>

              <Column header="Status" :style="{ width: '100px' }">
                <template #body="{ data }">
                  <div
                    v-if="data"
                    class="cursor-pointer"
                    @click="table.handleRowClick(data)"
                  >
                    <div class="flex items-center gap-2">
                      <i
                        :class="
                          data.enabled
                            ? 'fas fa-check-circle text-green-500'
                            : 'fas fa-times-circle text-gray-500'
                        "
                      ></i>
                      <span
                        :class="
                          data.enabled ? 'text-green-400' : 'text-gray-400'
                        "
                        class="text-sm font-medium"
                      >
                        {{ data.enabled ? "Enabled" : "Disabled" }}
                      </span>
                    </div>
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
          {{ selectedCountValue }} variables will be imported into:
          <span class="text-secondary-400 font-mono"
            >[ReDocs]-{{ environmentName }}</span
          >
        </span>

        <div class="flex items-center gap-4">
          <Button
            label="Cancel Import"
            severity="secondary"
            class="flex items-center gap-2"
            @click="table.handleCancel"
          >
            <template #icon><i class="fas fa-times"></i></template>
          </Button>

          <Button
            :label="`Import ${selectedCountValue} Variables`"
            :disabled="isContinueDisabledValue"
            class="flex items-center gap-2"
            @click="table.handleContinue"
          >
            <template #icon><i class="fas fa-check"></i></template>
          </Button>
        </div>
      </div>
    </template>
  </Dialog>
</template>
