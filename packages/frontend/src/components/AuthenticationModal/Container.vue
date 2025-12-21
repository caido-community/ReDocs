<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Textarea from "primevue/textarea";
import { computed, ref, watchEffect } from "vue";

const props = defineProps<{
  visible: boolean;
  authInfo: {
    hasAuth: boolean;
    authType: string;
    description: string;
    schemes?: Array<{ name: string; type: string; description: string }>;
  };
  collectionName: string;
  requestCount: number;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "auth-configured": [authConfig: any];
  "auth-skipped": [authConfig?: any];
}>();

const selectedAuthType = ref("");
const apiKey = ref("");
const apiKeyHeader = ref("x-api-key");
const bearerToken = ref("");
const basicUsername = ref("");
const basicPassword = ref("");
const customHeaderName = ref("");
const customHeaderValue = ref("");
const hostname = ref("");

const authTypeOptions = computed(() => {
  const options = [
    { label: "Skip Authentication", value: "none" },
    { label: "API Key (Header)", value: "apikey" },
    { label: "Bearer Token", value: "bearer" },
    { label: "Basic Authentication", value: "basic" },
    { label: "Custom Header", value: "custom" },
  ];

  if (props.authInfo.schemes && props.authInfo.schemes.length > 0) {
    const detectedOptions = props.authInfo.schemes.map((scheme) => ({
      label: `${scheme.type} (Detected)`,
      value: `detected-${scheme.name}`,
    }));
    return [...detectedOptions, ...options];
  }

  return options;
});

const initializeAuthType = () => {
  if (props.authInfo.hasAuth) {
    if (props.authInfo.authType === "bearer") {
      selectedAuthType.value = "bearer";
    } else if (props.authInfo.authType === "apikey") {
      selectedAuthType.value = "apikey";
    } else if (props.authInfo.authType === "basic") {
      selectedAuthType.value = "basic";
    } else if (props.authInfo.schemes && props.authInfo.schemes.length > 0) {
      selectedAuthType.value = `detected-${props.authInfo.schemes[0]?.name}`;
    }
  } else {
    selectedAuthType.value = "none";
  }
};

watchEffect(() => {
  if (props.visible && props.authInfo) {
    initializeAuthType();
  }
});

const configureAuthentication = () => {
  let authConfig: any = { type: "none" };

  const baseConfig = {
    hostname: hostname.value?.trim() || undefined,
  };

  if (selectedAuthType.value === "none") {
    authConfig = { ...baseConfig, type: "none" };
  } else if (selectedAuthType.value === "apikey") {
    if (!apiKey.value.trim()) return;
    authConfig = {
      ...baseConfig,
      type: "apikey",
      key: apiKeyHeader.value || "x-api-key",
      value: apiKey.value.trim(),
    };
  } else if (selectedAuthType.value === "bearer") {
    if (!bearerToken.value.trim()) return;
    authConfig = {
      ...baseConfig,
      type: "bearer",
      token: bearerToken.value.trim(),
    };
  } else if (selectedAuthType.value === "basic") {
    if (!basicUsername.value.trim() || !basicPassword.value.trim()) return;
    authConfig = {
      ...baseConfig,
      type: "basic",
      username: basicUsername.value.trim(),
      password: basicPassword.value.trim(),
    };
  } else if (selectedAuthType.value === "custom") {
    if (!customHeaderName.value.trim() || !customHeaderValue.value.trim())
      return;
    authConfig = {
      ...baseConfig,
      type: "custom",
      header: customHeaderName.value.trim(),
      value: customHeaderValue.value.trim(),
    };
  } else if (selectedAuthType.value.startsWith("detected-")) {
    const schemeName = selectedAuthType.value.replace("detected-", "");
    const scheme = props.authInfo.schemes?.find((s) => s.name === schemeName);
    if (scheme) {
      authConfig = {
        ...baseConfig,
        type: "detected",
        scheme: scheme,
      };
    }
  }

  emit("auth-configured", authConfig);
  closeModal();
};

const skipAuthentication = () => {
  const authConfig = {
    type: "none",
    hostname: hostname.value?.trim() || undefined,
  };
  emit("auth-skipped", authConfig);
  closeModal();
};

const closeModal = () => {
  emit("update:visible", false);
  selectedAuthType.value = "";
  apiKey.value = "";
  bearerToken.value = "";
  basicUsername.value = "";
  basicPassword.value = "";
  customHeaderName.value = "";
  customHeaderValue.value = "";
};

const isFormValid = computed(() => {
  if (selectedAuthType.value === "none") return true;
  if (selectedAuthType.value === "apikey")
    return apiKey.value.trim().length > 0;
  if (selectedAuthType.value === "bearer")
    return bearerToken.value.trim().length > 0;
  if (selectedAuthType.value === "basic")
    return (
      basicUsername.value.trim().length > 0 &&
      basicPassword.value.trim().length > 0
    );
  if (selectedAuthType.value === "custom")
    return (
      customHeaderName.value.trim().length > 0 &&
      customHeaderValue.value.trim().length > 0
    );
  return true;
});
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :style="{
      width: '90vw',
      maxWidth: '1000px',
      height: 'auto',
      maxHeight: '80vh',
    }"
    :draggable="false"
    class="authentication-modal"
    :breakpoints="{ '960px': '98vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="fas fa-shield-alt text-xl text-secondary-400"></i>
        <span class="text-lg font-semibold">Authentication Configuration</span>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <Card>
        <template #content>
          <div class="flex items-center gap-3">
            <i class="fas fa-file-import text-secondary-400"></i>
            <div>
              <h3 class="font-semibold text-surface-900 dark:text-surface-0">
                {{ collectionName }}
              </h3>
              <p class="text-sm font-medium text-surface-0">
                {{ requestCount }} requests found
              </p>
            </div>
          </div>

          <Message
            v-if="!authInfo.hasAuth"
            severity="warn"
            :closable="false"
            class="mb-4"
          >
            <div class="text-sm">
              <strong>No Authentication Detected</strong> - You can still
              configure authentication manually if needed.
            </div>
          </Message>
        </template>
      </Card>

      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="fas fa-cog text-secondary-400"></i>
            <span>Configure Authentication</span>
          </div>
        </template>
        <template #content>
          <div class="flex flex-col gap-2">
            <div class="mb-3">
              <label
                for="authType"
                class="block text-sm font-medium text-white mb-2"
                >Authentication Type</label
              >
              <Dropdown
                id="authType"
                v-model="selectedAuthType"
                :options="authTypeOptions"
                option-label="label"
                option-value="value"
                placeholder="Select authentication type"
                class="w-full"
              />
            </div>

            <div
              v-if="selectedAuthType === 'apikey'"
              class="flex flex-col gap-3 mb-3"
            >
              <div>
                <label
                  for="apiKeyHeader"
                  class="block text-sm font-medium text-white mb-2"
                  >Header Name</label
                >
                <InputText
                  id="apiKeyHeader"
                  v-model="apiKeyHeader"
                  placeholder="e.g., x-api-key, Authorization"
                  class="w-full"
                />
              </div>
              <div>
                <label
                  for="apiKey"
                  class="block text-sm font-medium text-white mb-2"
                  >API Key</label
                >
                <InputText
                  id="apiKey"
                  v-model="apiKey"
                  placeholder="Enter your API key"
                  class="w-full"
                  type="password"
                />
              </div>
            </div>

            <div v-if="selectedAuthType === 'bearer'" class="mb-3">
              <label
                for="bearerToken"
                class="block text-sm font-medium text-white mb-2"
                >Bearer Token</label
              >
              <Textarea
                id="bearerToken"
                v-model="bearerToken"
                placeholder="Enter your bearer token (without 'Bearer ' prefix)"
                class="w-full"
                :rows="3"
              />
            </div>

            <div
              v-if="selectedAuthType === 'basic'"
              class="flex flex-col gap-3 mb-3"
            >
              <div>
                <label
                  for="basicUsername"
                  class="block text-sm font-medium text-white mb-2"
                  >Username</label
                >
                <InputText
                  id="basicUsername"
                  v-model="basicUsername"
                  placeholder="Enter username"
                  class="w-full"
                />
              </div>
              <div class="field-item">
                <label
                  for="basicPassword"
                  class="block text-sm font-medium text-white mb-2"
                  >Password</label
                >
                <InputText
                  id="basicPassword"
                  v-model="basicPassword"
                  placeholder="Enter password"
                  class="w-full"
                  type="password"
                />
              </div>
            </div>

            <div
              v-if="selectedAuthType === 'custom'"
              class="flex flex-col gap-3 mb-3"
            >
              <div class="field-item">
                <label
                  for="customHeaderName"
                  class="block text-sm font-medium text-white mb-2"
                  >Header Name</label
                >
                <InputText
                  id="customHeaderName"
                  v-model="customHeaderName"
                  placeholder="e.g., Authorization, X-Custom-Auth"
                  class="w-full"
                />
              </div>
              <div class="field-item">
                <label
                  for="customHeaderValue"
                  class="block text-sm font-medium text-white mb-2"
                  >Header Value</label
                >
                <InputText
                  id="customHeaderValue"
                  v-model="customHeaderValue"
                  placeholder="Enter header value"
                  class="w-full"
                  type="password"
                />
              </div>
            </div>

            <div class="mb-3">
              <label
                for="hostname"
                class="block text-sm font-medium text-white mb-2"
                >Hostname (Optional)</label
              >
              <InputText
                id="hostname"
                v-model="hostname"
                placeholder="e.g., api.example.com or leave empty for auto-detection"
                class="w-full"
              />
              <small class="text-surface-600 dark:text-surface-300">
                Override the hostname for all requests. Leave empty to use
                detected hostname from the API documentation.
              </small>
            </div>

            <div v-if="selectedAuthType === 'none'" class="field"></div>
          </div>
        </template>
      </Card>
    </div>

    <template #footer>
      <div class="flex justify-end items-center gap-3">
        <Button
          label="Skip Authentication"
          severity="secondary"
          class="flex items-center"
          @click="skipAuthentication"
        >
          <template #icon><i class="fas fa-times"></i></template>
        </Button>

        <Button
          label="Apply & Continue"
          :disabled="!isFormValid"
          class="flex items-center"
          @click="configureAuthentication"
        >
          <template #icon><i class="fas fa-check"></i></template>
        </Button>
      </div>
    </template>
  </Dialog>
</template>
