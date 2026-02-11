import { resolveSchemaRef } from "./resolveSchemaRef.js";

export function generateExampleFromSchema(
  schema: unknown,
  spec: Record<string, unknown>,
  visited: Set<string> = new Set(),
): unknown {
  if (schema === undefined || schema === null || typeof schema !== "object") {
    return undefined;
  }

  const s = schema as Record<string, unknown>;
  if (s.$ref !== undefined) {
    if (visited.has(s.$ref as string)) {
      return undefined;
    }
    const resolvedSchema = resolveSchemaRef(
      s.$ref as string,
      spec,
      new Set(visited),
    );
    if (resolvedSchema !== undefined) {
      visited.add(s.$ref as string);
      return generateExampleFromSchema(resolvedSchema, spec, visited);
    }
    return undefined;
  }

  if (s.example !== undefined) {
    return s.example;
  }
  const schemaType = s.type as string | undefined;
  switch (schemaType) {
    case "string": {
      const enumArr = s.enum as unknown[] | undefined;
      if (enumArr !== undefined && enumArr.length > 0) {
        return enumArr[0];
      }
      const format = s.format as string | undefined;
      if (format === "email") return "user@example.com";
      if (format === "date") return "2024-01-01";
      if (format === "date-time") return "2024-01-01T00:00:00Z";
      if (format === "uuid") return "550e8400-e29b-41d4-a716-446655440000";
      return s.pattern !== undefined ? "example" : "string";
    }
    case "number":
    case "integer": {
      const enumArr = s.enum as unknown[] | undefined;
      if (enumArr !== undefined && enumArr.length > 0) {
        return enumArr[0];
      }
      return s.minimum !== undefined ? s.minimum : 0;
    }
    case "boolean":
      return true;
    case "array": {
      const items = s.items;
      if (items !== undefined) {
        const itemExample = generateExampleFromSchema(items, spec, visited);
        return itemExample !== undefined ? [itemExample] : [];
      }
      return [];
    }
    case "object": {
      const obj: Record<string, unknown> = {};
      const properties = s.properties as Record<string, unknown> | undefined;
      if (properties !== undefined) {
        for (const [propName, propSchema] of Object.entries(properties)) {
          const propExample = generateExampleFromSchema(
            propSchema,
            spec,
            visited,
          );
          if (propExample !== undefined) {
            obj[propName] = propExample;
          }
        }
      }
      const required = s.required as string[] | undefined;
      if (required !== undefined && Array.isArray(required)) {
        for (const requiredProp of required) {
          if (
            !(requiredProp in obj) &&
            properties?.[requiredProp] !== undefined
          ) {
            const propExample = generateExampleFromSchema(
              properties[requiredProp],
              spec,
              visited,
            );
            obj[requiredProp] =
              propExample !== undefined ? propExample : "required_value";
          }
        }
      }
      return Object.keys(obj).length > 0 ? obj : undefined;
    }
    default:
      return undefined;
  }
}
