import type { SDK } from "caido:plugin";

type CaidoEnvironmentVariable = {
  name: string;
  value: string;
  secret: boolean;
  global?: boolean;
};

type EnvironmentCreationResult = {
  success: boolean;
  environmentName: string;
  variablesCreated: number;
  message: string;
  error?: string;
};

export async function createCaidoEnvironment(
  sdk: SDK,
  variables: CaidoEnvironmentVariable[],
  originalEnvironmentName: string,
): Promise<EnvironmentCreationResult> {
  try {
    const environmentName = originalEnvironmentName;
    let createdCount = 0;
    const errors: string[] = [];

    for (const variable of variables) {
      try {
        await sdk.env.setVar({
          name: variable.name,
          value: variable.value,
          secret: variable.secret,
          env: environmentName,
        } as Parameters<typeof sdk.env.setVar>[0] & { env: string });
        createdCount++;
      } catch (error) {
        const errorMsg = `Failed to create variable "${variable.name}": ${error}`;
        errors.push(errorMsg);
      }
    }
    const allSuccessful = createdCount === variables.length;
    const partialSuccess = createdCount > 0 && createdCount < variables.length;

    let message: string;
    if (allSuccessful) {
      message = `Successfully added ${createdCount} variables to environment`;
    } else if (partialSuccess) {
      message = `Partially added variables: ${createdCount}/${variables.length} variables created`;
    } else {
      message = `Failed to add variables: no variables were created`;
    }

    return {
      success: createdCount > 0,
      environmentName,
      variablesCreated: createdCount,
      message,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  } catch (error) {
    const errorMessage = `Failed to create environment: ${error}`;

    return {
      success: false,
      environmentName: `[ReDocs]-${originalEnvironmentName}`,
      variablesCreated: 0,
      message: errorMessage,
      error: errorMessage,
    };
  }
}

export function validateEnvironmentCreation(
  variables: CaidoEnvironmentVariable[],
  environmentName: string,
): { valid: boolean; error?: string } {
  if (environmentName.trim().length === 0) {
    return { valid: false, error: "Environment name cannot be empty" };
  }

  if (variables.length === 0) {
    return { valid: false, error: "At least one variable must be provided" };
  }

  const variableNames = variables.map((v) => v.name.toLowerCase());
  const uniqueNames = new Set(variableNames);
  if (variableNames.length !== uniqueNames.size) {
    return { valid: false, error: "Duplicate variable names are not allowed" };
  }

  for (const variable of variables) {
    if (variable.name.trim().length === 0) {
      return { valid: false, error: "Variable names cannot be empty" };
    }

    if (variable.name.includes(" ")) {
      return { valid: false, error: "Variable names cannot contain spaces" };
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
      return {
        valid: false,
        error: `Invalid variable name: "${variable.name}". Use only letters, numbers, and underscores.`,
      };
    }
  }

  return { valid: true };
}

export function convertToCaidoVariables(
  environmentVariables: Array<{
    key: string;
    value: string;
    enabled: boolean;
    isSecret: boolean;
  }>,
): CaidoEnvironmentVariable[] {
  const filtered = environmentVariables.filter((variable) => variable.enabled);

  const converted = filtered.map((variable) => ({
    name: variable.key,
    value: variable.value,
    secret: variable.isSecret,
    global: false,
  }));
  return converted;
}
