import { computed, ref, watchEffect } from "vue";

import type { AuthConfig, AuthenticationInfo } from "../../types/index";

const AUTH_TYPE_OPTIONS = [
  { label: "Skip Authentication", value: "none" },
  { label: "API Key (Header)", value: "apikey" },
  { label: "Bearer Token", value: "bearer" },
  { label: "Basic Authentication", value: "basic" },
  { label: "Custom Header", value: "custom" },
] as const;

export const useAuthenticationForm = (
  visible: () => boolean,
  authInfo: () => AuthenticationInfo,
  onConfigure: (config: AuthConfig) => void,
  onSkip: (config?: AuthConfig) => void,
  onClose: () => void,
) => {
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
    const info = authInfo();
    if (info.schemes !== undefined && info.schemes.length > 0) {
      const detectedOptions = info.schemes.map(
        (scheme: { type: string; name: string }) => ({
          label: `${scheme.type} (Detected)`,
          value: `detected-${scheme.name}`,
        }),
      );
      return [...detectedOptions, ...AUTH_TYPE_OPTIONS];
    }
    return [...AUTH_TYPE_OPTIONS];
  });

  const initializeAuthType = () => {
    const info = authInfo();
    if (info.hasAuth) {
      if (info.authType === "bearer") {
        selectedAuthType.value = "bearer";
      } else if (info.authType === "apikey") {
        selectedAuthType.value = "apikey";
      } else if (info.authType === "basic") {
        selectedAuthType.value = "basic";
      } else if (info.schemes !== undefined && info.schemes.length > 0) {
        const first = info.schemes[0];
        selectedAuthType.value =
          first !== undefined ? `detected-${first.name}` : "none";
      } else {
        selectedAuthType.value = "none";
      }
    } else {
      selectedAuthType.value = "none";
    }
  };

  watchEffect(() => {
    if (visible() && authInfo()) {
      initializeAuthType();
    }
  });

  const buildAuthConfig = (): AuthConfig | undefined => {
    const baseConfig = {
      hostname: hostname.value?.trim() || undefined,
    };

    if (selectedAuthType.value === "none") {
      return { ...baseConfig, type: "none" };
    }
    if (selectedAuthType.value === "apikey") {
      if (apiKey.value.trim().length === 0) return undefined;
      return {
        ...baseConfig,
        type: "apikey",
        key: apiKeyHeader.value || "x-api-key",
        value: apiKey.value.trim(),
      };
    }
    if (selectedAuthType.value === "bearer") {
      if (bearerToken.value.trim().length === 0) return undefined;
      return {
        ...baseConfig,
        type: "bearer",
        token: bearerToken.value.trim(),
      };
    }
    if (selectedAuthType.value === "basic") {
      if (
        basicUsername.value.trim().length === 0 ||
        basicPassword.value.trim().length === 0
      ) {
        return undefined;
      }
      return {
        ...baseConfig,
        type: "basic",
        username: basicUsername.value.trim(),
        password: basicPassword.value.trim(),
      };
    }
    if (selectedAuthType.value === "custom") {
      if (
        customHeaderName.value.trim().length === 0 ||
        customHeaderValue.value.trim().length === 0
      ) {
        return undefined;
      }
      return {
        ...baseConfig,
        type: "custom",
        header: customHeaderName.value.trim(),
        value: customHeaderValue.value.trim(),
      };
    }
    if (selectedAuthType.value.startsWith("detected-")) {
      const schemeName = selectedAuthType.value.replace("detected-", "");
      const scheme = authInfo().schemes?.find(
        (s: { name: string }) => s.name === schemeName,
      );
      if (scheme !== undefined) {
        return {
          ...baseConfig,
          type: "detected",
          scheme,
        };
      }
    }
    return { ...baseConfig, type: "none" };
  };

  const configure = () => {
    const config = buildAuthConfig();
    if (config === undefined) return;
    onConfigure(config);
    reset();
    onClose();
  };

  const skip = () => {
    const config: AuthConfig = {
      type: "none",
      hostname: hostname.value?.trim() || undefined,
    };
    onSkip(config);
    reset();
    onClose();
  };

  const reset = () => {
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
    if (selectedAuthType.value === "basic") {
      return (
        basicUsername.value.trim().length > 0 &&
        basicPassword.value.trim().length > 0
      );
    }
    if (selectedAuthType.value === "custom") {
      return (
        customHeaderName.value.trim().length > 0 &&
        customHeaderValue.value.trim().length > 0
      );
    }
    return true;
  });

  return {
    selectedAuthType,
    apiKey,
    apiKeyHeader,
    bearerToken,
    basicUsername,
    basicPassword,
    customHeaderName,
    customHeaderValue,
    hostname,
    authTypeOptions,
    isFormValid,
    configure,
    skip,
  };
};
