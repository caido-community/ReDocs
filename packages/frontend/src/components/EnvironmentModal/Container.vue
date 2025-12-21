<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  visible: boolean;
  variables: Array<any>;
  environmentName: string;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "variables-selected": [
    selectedVariables: Array<any>,
    environmentName: string,
  ];
  "selection-cancelled": [];
}>();

const selectedVariables = ref<Set<string>>(new Set());
const editableVariables = ref<Map<string, any>>(new Map());

const variableTypeOptions = [
  { label: "Plain Text", value: "plain" },
  { label: "Secret", value: "secret" },
];

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const tableData = computed(() => {
  const currentSelection = selectedVariables.value;
  const usedIds = new Set<string>();

  return props.variables.map((variable, index) => {
    let variableId = variable.key || `var_${index}_${variable.key}`;

    let counter = 0;
    let originalId = variableId;
    while (usedIds.has(variableId)) {
      counter++;
      variableId = `${originalId}_${counter}`;
    }
    usedIds.add(variableId);

    const editableVar = editableVariables.value.get(variableId) || variable;

    return {
      id: variableId,
      key: editableVar.key || variable.key,
      value: editableVar.value || variable.value,
      enabled:
        editableVar.enabled !== undefined
          ? editableVar.enabled
          : variable.enabled,
      isSecret:
        editableVar.isSecret !== undefined
          ? editableVar.isSecret
          : variable.isSecret,
      selected: currentSelection.has(variableId),
      originalVariable: variable,
    };
  });
});

const selectedCount = computed(() => selectedVariables.value.size);
const totalCount = computed(() => props.variables.length);

const selectAll = computed({
  get: () => {
    const tableItems = tableData.value;
    const selection = selectedVariables.value;
    return (
      tableItems.length > 0 &&
      tableItems.every((item) => selection.has(item.id))
    );
  },
  set: (value: boolean) => {
    const tableItems = tableData.value;
    if (value) {
      selectedVariables.value = new Set(tableItems.map((item) => item.id));
    } else {
      selectedVariables.value = new Set();
    }
  },
});

watch(
  () => props.variables,
  (newVariables) => {
    if (newVariables && newVariables.length > 0) {
      const usedIds = new Set<string>();
      const newSelection = new Set<string>();
      const newEditableVars = new Map<string, any>();

      newVariables.forEach((variable, index) => {
        let variableId = variable.key || `var_${index}_${variable.key}`;

        let counter = 0;
        let originalId = variableId;
        while (usedIds.has(variableId)) {
          counter++;
          variableId = `${originalId}_${counter}`;
        }
        usedIds.add(variableId);
        newSelection.add(variableId);
        newEditableVars.set(variableId, { ...variable });
      });

      selectedVariables.value = newSelection;
      editableVariables.value = newEditableVars;
    }
  },
  { immediate: true },
);

const handleVariableSelection = (
  variableId: string,
  selected: boolean | any,
) => {
  const newSelection = new Set(selectedVariables.value);

  if (selected) {
    newSelection.add(variableId);
  } else {
    newSelection.delete(variableId);
  }

  selectedVariables.value = newSelection;
};

const handleRowClick = (rowData: any) => {
  const isSelected = selectedVariables.value.has(rowData.id);
  handleVariableSelection(rowData.id, !isSelected);
};

const updateVariable = (variableId: string, field: string, value: any) => {
  const current = editableVariables.value.get(variableId) || {};
  const updated = { ...current, [field]: value };
  editableVariables.value.set(variableId, updated);
  editableVariables.value = new Map(editableVariables.value);
};

const handleSecretTypeChange = (variableId: string, value: string) => {
  updateVariable(variableId, "isSecret", value === "secret");
};

const handleContinue = () => {
  const tableItems = tableData.value;
  const selected = tableItems
    .filter((item) => selectedVariables.value.has(item.id))
    .map((item) => ({
      key: item.key,
      value: item.value,
      enabled: item.enabled,
      isSecret: item.isSecret,
      originalVariable: item.originalVariable,
    }));

  emit("variables-selected", selected, props.environmentName);
  closeModal();
};

const handleCancel = () => {
  emit("selection-cancelled");
  closeModal();
};

const closeModal = () => {
  dialogVisible.value = false;
};
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
                  {{ totalCount }} environment variables found
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
              <span>Available Variables</span>
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
              class="variable-selection-table"
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
                        (value) => handleVariableSelection(data.id, value)
                      "
                    />
                  </div>
                </template>
              </Column>

              <Column header="Variable Name" :style="{ minWidth: '200px' }">
                <template #body="{ data }">
                  <div class="cursor-pointer" @click="handleRowClick(data)">
                    <InputText
                      :model-value="data.key"
                      class="w-full"
                      size="small"
                      @update:model-value="
                        (value) => updateVariable(data.id, 'key', value)
                      "
                      @click.stop
                    />
                  </div>
                </template>
              </Column>

              <Column header="Value" :style="{ minWidth: '250px' }">
                <template #body="{ data }">
                  <div class="cursor-pointer" @click="handleRowClick(data)">
                    <InputText
                      :model-value="data.value"
                      :type="data.isSecret ? 'password' : 'text'"
                      class="w-full"
                      size="small"
                      placeholder="Enter variable value..."
                      @update:model-value="
                        (value) => updateVariable(data.id, 'value', value)
                      "
                      @click.stop
                    />
                  </div>
                </template>
              </Column>

              <Column header="Type" :style="{ width: '140px' }">
                <template #body="{ data }">
                  <div class="cursor-pointer" @click="handleRowClick(data)">
                    <Dropdown
                      :model-value="data.isSecret ? 'secret' : 'plain'"
                      :options="variableTypeOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      size="small"
                      @update:model-value="
                        (value) => handleSecretTypeChange(data.id, value)
                      "
                      @click.stop
                    />
                  </div>
                </template>
              </Column>

              <Column header="Status" :style="{ width: '100px' }">
                <template #body="{ data }">
                  <div class="cursor-pointer" @click="handleRowClick(data)">
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
          {{ selectedCount }} variables will be imported into:
          <span class="text-secondary-400 font-mono"
            >[ReDocs]-{{ environmentName }}</span
          >
        </span>

        <div class="flex items-center gap-4">
          <Button
            label="Cancel Import"
            severity="secondary"
            class="flex items-center gap-2"
            @click="handleCancel"
          >
            <template #icon><i class="fas fa-times"></i></template>
          </Button>

          <Button
            :label="`Import ${selectedCount} Variables`"
            :disabled="selectedCount === 0"
            class="flex items-center gap-2"
            @click="handleContinue"
          >
            <template #icon><i class="fas fa-check"></i></template>
          </Button>
        </div>
      </div>
    </template>
  </Dialog>
</template>
