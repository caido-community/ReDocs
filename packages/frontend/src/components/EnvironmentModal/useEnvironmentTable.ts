import { computed, ref, watch } from "vue";

import type { EnvironmentVariable } from "../../types/index";

const ensureUniqueId = (baseId: string, usedIds: Set<string>): string => {
  let id = baseId;
  let counter = 0;
  const originalId = id;
  while (usedIds.has(id)) {
    counter++;
    id = `${originalId}_${counter}`;
  }
  usedIds.add(id);
  return id;
};

type EnvironmentRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  isSecret: boolean;
  selected: boolean;
  originalVariable: EnvironmentVariable;
};

export const useEnvironmentTable = (
  variables: () => EnvironmentVariable[],
  environmentName: () => string,
  onContinue: (selected: EnvironmentVariable[], envName: string) => void,
  onCancel: () => void,
  onClose: () => void,
) => {
  const selectedVariables = ref<Set<string>>(new Set());
  const editableVariables = ref<Map<string, Partial<EnvironmentVariable>>>(
    new Map(),
  );

  const tableData = computed((): EnvironmentRow[] => {
    const currentSelection = selectedVariables.value;
    const usedIds = new Set<string>();
    const vars = variables().filter(
      (v): v is EnvironmentVariable =>
        v !== undefined && v !== null && typeof v === "object",
    );

    return vars.map((variable, index) => {
      const variableId = ensureUniqueId(
        variable.key !== undefined
          ? variable.key
          : `var_${index}_${variable.key}`,
        usedIds,
      );
      const editableVar = editableVariables.value.get(variableId) ?? variable;

      return {
        id: variableId,
        key: editableVar.key ?? variable.key,
        value: editableVar.value ?? variable.value,
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
  const totalCount = computed(() => variables().length);

  const selectAll = computed({
    get: () => {
      const items = tableData.value;
      const selection = selectedVariables.value;
      return items.length > 0 && items.every((item) => selection.has(item.id));
    },
    set: (value: boolean) => {
      const items = tableData.value;
      selectedVariables.value = value
        ? new Set(items.map((item) => item.id))
        : new Set();
    },
  });

  watch(
    () => variables(),
    (newVariables) => {
      if (
        newVariables !== undefined &&
        newVariables !== null &&
        Array.isArray(newVariables) &&
        newVariables.length > 0
      ) {
        const usedIds = new Set<string>();
        const newSelection = new Set<string>();
        const newEditable = new Map<string, Partial<EnvironmentVariable>>();

        newVariables.forEach((variable, index) => {
          const variableId = ensureUniqueId(
            variable.key !== undefined
              ? variable.key
              : `var_${index}_${variable.key}`,
            usedIds,
          );
          newSelection.add(variableId);
          newEditable.set(variableId, { ...variable });
        });

        selectedVariables.value = newSelection;
        editableVariables.value = newEditable;
      }
    },
    { immediate: true },
  );

  const handleVariableSelection = (variableId: string, selected: boolean) => {
    const next = new Set(selectedVariables.value);
    if (selected) {
      next.add(variableId);
    } else {
      next.delete(variableId);
    }
    selectedVariables.value = next;
  };

  const handleRowClick = (rowData: EnvironmentRow) => {
    const selected = selectedVariables.value.has(rowData.id);
    handleVariableSelection(rowData.id, !selected);
  };

  const updateVariable = (
    variableId: string,
    field: keyof EnvironmentVariable,
    value: string | boolean,
  ) => {
    const current = editableVariables.value.get(variableId) ?? {};
    editableVariables.value.set(variableId, { ...current, [field]: value });
    editableVariables.value = new Map(editableVariables.value);
  };

  const handleSecretTypeChange = (variableId: string, value: string) => {
    updateVariable(variableId, "isSecret", value === "secret");
  };

  const handleContinue = () => {
    const items = tableData.value;
    const selected = items
      .filter((item) => selectedVariables.value.has(item.id))
      .map((item) => ({
        key: item.key,
        value: item.value,
        enabled: item.enabled,
        isSecret: item.isSecret,
      }));
    onContinue(selected as EnvironmentVariable[], environmentName());
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  const toggleSelectAll = () => {
    selectAll.value = !selectAll.value;
  };

  const isContinueDisabled = computed(() => selectedCount.value === 0);

  return {
    tableData,
    selectedCount,
    totalCount,
    selectAll,
    isContinueDisabled,
    handleVariableSelection,
    handleRowClick,
    updateVariable,
    handleSecretTypeChange,
    handleContinue,
    handleCancel,
    toggleSelectAll,
  };
};
