export type AuthScheme = {
  name: string;
  type: string;
  description: string;
};

export type AuthConfig = {
  type: "none" | "apikey" | "bearer" | "basic" | "custom" | "detected";
  key?: string;
  value?: string;
  token?: string;
  username?: string;
  password?: string;
  header?: string;
  hostname?: string;
  scheme?: AuthScheme;
};

export type EnvironmentVariable = {
  key: string;
  value: string;
  enabled: boolean;
  isSecret: boolean;
  type?: string;
};

export type AuthenticationInfo = {
  hasAuth: boolean;
  authType: string;
  description: string;
  schemes?: AuthScheme[];
};

export type ImportResult = {
  success: boolean;
  type?: string;
  collectionName?: string;
  description?: string;
  sessionCount?: number;
  requests?: unknown[];
  authentication?: AuthenticationInfo;
  environmentName?: string;
  variables?: EnvironmentVariable[];
  variableCount?: number;
  version?: string;
  baseUrl?: string;
  message?: string;
  error?: string;
  uploadedFileInfo?: {
    content: string;
    name: string;
  };
  savedFileName?: string;
};

export type SessionCreationResult = {
  success: boolean;
  processedRequests?: unknown[];
  collectionName: string;
  message?: string;
};

export type EnvironmentCreationResult = {
  success: boolean;
  environmentName?: string;
  variablesCreated?: number;
  message?: string;
  error?: string;
};

export type Result<T> =
  | { kind: "Ok"; value: T }
  | { kind: "Error"; error: string };
