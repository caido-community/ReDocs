import { computed, ref, watch } from "vue";

import type { ImportedRequest } from "../../types/index";
import { getPathFromUrl } from "../../utils";

type RequestRow = {
  id: string;
  name: string;
  method: string;
  path: string;
  url: string;
  request: ImportedRequest;
  selected: boolean;
};

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

export const getMethodBadgeClass = (method: string): string => {
  const base = "px-3 py-1.5 text-xs font-bold rounded-md border";
  const upper =
    typeof method === "string" && method !== "" ? method.toUpperCase() : "GET";
  switch (upper) {
    case "GET":
      return `${base} bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800`;
    case "POST":
      return `${base} bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800`;
    case "PUT":
      return `${base} bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800`;
    case "PATCH":
      return `${base} bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800`;
    case "DELETE":
      return `${base} bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`;
    default:
      return `${base} bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800`;
  }
};

export const useRequestTable = (
  requests: () => ImportedRequest[],
  onContinue: (selected: ImportedRequest[]) => void,
  onCancel: () => void,
  onClose: () => void,
) => {
  const selectedRequests = ref<Set<string>>(new Set());

  const tableData = computed((): RequestRow[] => {
    const selection = selectedRequests.value;
    const usedIds = new Set<string>();
    const reqs = requests().filter(
      (r): r is ImportedRequest => r !== undefined && r !== null,
    );

    return reqs.map((request, index) => {
      const method =
        typeof request.method === "string" ? request.method : "GET";
      const url = typeof request.url === "string" ? request.url : "";
      const requestId = ensureUniqueId(
        request.id ?? `req_${index}_${method}_${url}`,
        usedIds,
      );
      return {
        id: requestId,
        name:
          typeof request.name === "string" && request.name !== ""
            ? request.name
            : `${method} ${getPathFromUrl(url)}`,
        method: method.toUpperCase(),
        path: getPathFromUrl(url),
        url,
        request,
        selected: selection.has(requestId),
      };
    });
  });

  const selectedCount = computed(() => selectedRequests.value.size);
  const totalCount = computed(() => requests().length);

  const selectAll = computed({
    get: () => {
      const items = tableData.value;
      const selection = selectedRequests.value;
      return items.length > 0 && items.every((item) => selection.has(item.id));
    },
    set: (value: boolean) => {
      const items = tableData.value;
      selectedRequests.value = value
        ? new Set(items.map((item) => item.id))
        : new Set();
    },
  });

  watch(
    () => requests(),
    (newRequests) => {
      if (
        newRequests === undefined ||
        newRequests === null ||
        !Array.isArray(newRequests)
      ) {
        return;
      }
      const valid = newRequests.filter(
        (r): r is ImportedRequest => r !== undefined && r !== null,
      );
      if (valid.length > 0) {
        const usedIds = new Set<string>();
        const newSelection = new Set<string>();
        valid.forEach((request, index) => {
          const method =
            typeof request.method === "string" ? request.method : "GET";
          const url = typeof request.url === "string" ? request.url : "";
          const requestId = ensureUniqueId(
            request.id ?? `req_${index}_${method}_${url}`,
            usedIds,
          );
          newSelection.add(requestId);
        });
        selectedRequests.value = newSelection;
      }
    },
    { immediate: true },
  );

  const handleRequestSelection = (requestId: string, selected: boolean) => {
    const next = new Set(selectedRequests.value);
    if (selected) {
      next.add(requestId);
    } else {
      next.delete(requestId);
    }
    selectedRequests.value = next;
  };

  const handleRowClick = (rowData: RequestRow) => {
    const selected = selectedRequests.value.has(rowData.id);
    handleRequestSelection(rowData.id, !selected);
  };

  const handleContinue = () => {
    const items = tableData.value;
    const selected = items
      .filter((item) => selectedRequests.value.has(item.id))
      .map((item) => item.request);
    onContinue(selected);
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
    handleRequestSelection,
    handleRowClick,
    handleContinue,
    handleCancel,
    toggleSelectAll,
  };
};
