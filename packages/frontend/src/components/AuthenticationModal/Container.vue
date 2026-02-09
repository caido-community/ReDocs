<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Textarea from "primevue/textarea";
import { computed } from "vue";

import type { AuthConfig, AuthenticationInfo } from "../../types/index";

import { useAuthenticationForm } from "./useAuthenticationForm";

const props = defineProps<{
  visible: boolean;
  authInfo: AuthenticationInfo;
  collectionName: string;
  requestCount: number;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "auth-configured": [authConfig: AuthConfig];
  "auth-skipped": [authConfig?: AuthConfig];
}>();

const form = useAuthenticationForm(
  () => props.visible,
  () => props.authInfo,
  (config) => emit("auth-configured", config),
  (config) => emit("auth-skipped", config),
  () => emit("update:visible", false),
);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

function stringRefModel(ref: { value: string } | undefined) {
  return computed({
    get: () =>
      ref !== undefined && "value" in ref ? String(ref.value ?? "") : "",
    set: (v: string) => {
      if (ref !== undefined && "value" in ref) {
        (ref as { value: string }).value = v;
      }
    },
  });
}

const selectedAuthTypeModel = stringRefModel(form.selectedAuthType);
const hostnameModel = stringRefModel(form.hostname);
const apiKeyHeaderModel = stringRefModel(form.apiKeyHeader);
const apiKeyModel = stringRefModel(form.apiKey);
const bearerTokenModel = stringRefModel(form.bearerToken);
const basicUsernameModel = stringRefModel(form.basicUsername);
const basicPasswordModel = stringRefModel(form.basicPassword);
const customHeaderNameModel = stringRefModel(form.customHeaderName);
const customHeaderValueModel = stringRefModel(form.customHeaderValue);

const selectedAuthTypeValue = computed(() => {
  const v = form.selectedAuthType;
  if (typeof v === "string") return v;
  return v && typeof v === "object" && "value" in v
    ? String((v as { value: string }).value)
    : "";
});
const isApikey = computed(() => selectedAuthTypeValue.value === "apikey");
const isBearer = computed(() => selectedAuthTypeValue.value === "bearer");
const isBasic = computed(() => selectedAuthTypeValue.value === "basic");
const isCustom = computed(() => selectedAuthTypeValue.value === "custom");

const isFormValidValue = computed(() => {
  const v = form.isFormValid;
  if (typeof v === "boolean") return v;
  return v && typeof v === "object" && "value" in v
    ? Boolean((v as { value: boolean }).value)
    : false;
});

const authTypeOptionsValue = computed(() => {
  const v = form.authTypeOptions;
  if (Array.isArray(v)) return v;
  if (v !== undefined && v !== null && typeof v === "object" && "value" in v) {
    const val = (v as { value: unknown }).value;
    return Array.isArray(val) ? val : [];
  }
  return [];
});
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
              >
                Authentication Type
              </label>
              <Dropdown
                id="authType"
                v-model="selectedAuthTypeModel"
                :options="authTypeOptionsValue"
                option-label="label"
                option-value="value"
                placeholder="Select authentication type"
                class="w-full"
              />
            </div>

            <div v-if="isApikey" class="flex flex-col gap-3 mb-3">
              <div>
                <label
                  for="apiKeyHeader"
                  class="block text-sm font-medium text-white mb-2"
                >
                  Header Name
                </label>
                <InputText
                  id="apiKeyHeader"
                  v-model="apiKeyHeaderModel"
                  placeholder="e.g., x-api-key, Authorization"
                  class="w-full"
                />
              </div>
              <div>
                <label
                  for="apiKey"
                  class="block text-sm font-medium text-white mb-2"
                >
                  API Key
                </label>
                <InputText
                  id="apiKey"
                  v-model="apiKeyModel"
                  placeholder="Enter your API key"
                  class="w-full"
                  type="password"
                />
              </div>
            </div>

            <div v-if="isBearer" class="mb-3">
              <label
                for="bearerToken"
                class="block text-sm font-medium text-white mb-2"
              >
                Bearer Token
              </label>
              <Textarea
                id="bearerToken"
                v-model="bearerTokenModel"
                placeholder="Enter your bearer token (without 'Bearer ' prefix)"
                class="w-full"
                :rows="3"
              />
            </div>

            <div v-if="isBasic" class="flex flex-col gap-3 mb-3">
              <div>
                <label
                  for="basicUsername"
                  class="block text-sm font-medium text-white mb-2"
                >
                  Username
                </label>
                <InputText
                  id="basicUsername"
                  v-model="basicUsernameModel"
                  placeholder="Enter username"
                  class="w-full"
                />
              </div>
              <div>
                <label
                  for="basicPassword"
                  class="block text-sm font-medium text-white mb-2"
                >
                  Password
                </label>
                <InputText
                  id="basicPassword"
                  v-model="basicPasswordModel"
                  placeholder="Enter password"
                  class="w-full"
                  type="password"
                />
              </div>
            </div>

            <div v-if="isCustom" class="flex flex-col gap-3 mb-3">
              <div>
                <label
                  for="customHeaderName"
                  class="block text-sm font-medium text-white mb-2"
                >
                  Header Name
                </label>
                <InputText
                  id="customHeaderName"
                  v-model="customHeaderNameModel"
                  placeholder="e.g., Authorization, X-Custom-Auth"
                  class="w-full"
                />
              </div>
              <div>
                <label
                  for="customHeaderValue"
                  class="block text-sm font-medium text-white mb-2"
                >
                  Header Value
                </label>
                <InputText
                  id="customHeaderValue"
                  v-model="customHeaderValueModel"
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
              >
                Hostname (Optional)
              </label>
              <InputText
                id="hostname"
                v-model="hostnameModel"
                placeholder="e.g., api.example.com or leave empty for auto-detection"
                class="w-full"
              />
              <small class="text-surface-600 dark:text-surface-300">
                Override the hostname for all requests. Leave empty to use
                detected hostname from the API documentation.
              </small>
            </div>
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
          @click="form.skip"
        >
          <template #icon><i class="fas fa-times"></i></template>
        </Button>

        <Button
          label="Apply & Continue"
          :disabled="!isFormValidValue"
          class="flex items-center"
          @click="form.configure"
        >
          <template #icon><i class="fas fa-check"></i></template>
        </Button>
      </div>
    </template>
  </Dialog>
</template>
