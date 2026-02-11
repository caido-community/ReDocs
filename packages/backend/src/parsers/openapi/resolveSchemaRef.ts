export function resolveSchemaRef(
  ref: string,
  spec: Record<string, unknown>,
  visited: Set<string> = new Set(),
): unknown {
  if (visited.has(ref)) {
    return { type: "object", description: `Circular reference to ${ref}` };
  }

  visited.add(ref);

  if (!ref.startsWith("#/")) {
    return undefined;
  }

  const path = ref.substring(2).split("/");
  let current: unknown = spec;

  for (const segment of path) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object" ||
      !(segment in (current as Record<string, unknown>))
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (
    current !== undefined &&
    current !== null &&
    typeof current === "object" &&
    "$ref" in (current as Record<string, unknown>)
  ) {
    return resolveSchemaRef(
      (current as Record<string, unknown>).$ref as string,
      spec,
      visited,
    );
  }

  return current;
}
