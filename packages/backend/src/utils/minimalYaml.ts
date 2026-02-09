type MinimalYamlDoc = Record<string, unknown>;

function unquoteYamlScalar(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n");
  }
  return value;
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match?.[1]?.length ?? 0;
}

type StackEntry =
  | { kind: "obj"; obj: Record<string, unknown>; indent: number }
  | {
      kind: "array";
      parent: Record<string, unknown>;
      key: string;
      indent: number;
    };

function parseOneDocument(docContent: string): MinimalYamlDoc {
  const result: MinimalYamlDoc = {};
  const lines = docContent.split(/\r?\n/);
  const stack: StackEntry[] = [{ kind: "obj", obj: result, indent: -1 }];
  let i = 0;
  let multilineKey: string | undefined;
  let multilineIndent = 0;
  const multilineLines: string[] = [];

  function flushMultiline() {
    if (
      multilineKey !== undefined &&
      stack.length > 0 &&
      multilineLines.length > 0
    ) {
      const top = stack[stack.length - 1];
      if (top?.kind === "obj")
        top.obj[multilineKey] = multilineLines.join("\n").trim();
      multilineKey = undefined;
      multilineLines.length = 0;
    }
  }

  function currentObj(): Record<string, unknown> | undefined {
    const top = stack[stack.length - 1];
    if (top?.kind === "obj") return top.obj;
    if (top?.kind === "array") return top.parent;
    return undefined;
  }

  while (i < lines.length) {
    const line = lines[i];
    i++;
    if (line === undefined) continue;
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const indent = getIndent(line);

    if (multilineKey !== undefined) {
      if (indent > multilineIndent) {
        multilineLines.push(trimmed);
        continue;
      }
      flushMultiline();
    }

    while (stack.length > 1) {
      const curr = stack[stack.length - 1];
      const currIndent =
        curr?.kind === "obj" || curr?.kind === "array" ? curr.indent : -1;
      if (indent <= currIndent) stack.pop();
      else break;
    }

    const listItemMatch = trimmed.match(/^-\s+(\w+):\s*(.*)$/);
    const top = stack[stack.length - 1];

    if (listItemMatch !== null && top?.kind === "array") {
      const [, key, val] = listItemMatch;
      const arr = top.parent[top.key];
      if (!Array.isArray(arr)) continue;
      const item: Record<string, unknown> = {};
      if (key !== undefined) item[key] = unquoteYamlScalar(val?.trim() ?? "");
      arr.push(item);
      continue;
    }

    const keyColon = line.indexOf(":");
    if (keyColon < 0) continue;

    const key = line.slice(0, keyColon).trim();
    const valuePart = line.slice(keyColon + 1).trim();

    if (key === "" || key.startsWith("-")) continue;

    const obj = currentObj();
    if (obj === undefined) continue;

    if (top?.kind === "array" && key === "value") {
      const arr = top.parent[top.key];
      if (Array.isArray(arr) && arr.length > 0) {
        const last = arr[arr.length - 1] as Record<string, unknown>;
        last.value = unquoteYamlScalar(valuePart);
      }
      continue;
    }

    if (valuePart === "|" || valuePart === ">") {
      multilineKey = key;
      multilineIndent = indent;
      multilineLines.length = 0;
      continue;
    }

    if (valuePart !== "") {
      obj[key] = unquoteYamlScalar(valuePart);
      continue;
    }

    const nextLine = lines[i];
    const nextIndent = nextLine !== undefined ? getIndent(nextLine) : 0;
    if (nextIndent > indent) {
      const nextTrimmed = nextLine?.trim() ?? "";
      if (nextTrimmed.startsWith("- ")) {
        const arr: Record<string, unknown>[] = [];
        obj[key] = arr;
        stack.push({
          kind: "array",
          parent: obj,
          key,
          indent,
        });
      } else {
        const nested: Record<string, unknown> = {};
        obj[key] = nested;
        stack.push({ kind: "obj", obj: nested, indent });
      }
      continue;
    }

    obj[key] = "";
  }

  flushMultiline();
  return result;
}

function ensureHeadersArray(doc: MinimalYamlDoc): void {
  const http = doc.http;
  if (http === undefined || typeof http !== "object") return;
  const h = http as Record<string, unknown>;
  if (!Array.isArray(h.headers)) {
    h.headers = [];
  }
}

export function parseFirstDocument(
  content: string,
): MinimalYamlDoc | undefined {
  const docStr = content.split(/\n---\s*$/m)[0];
  if (docStr === undefined || docStr.trim() === "") return undefined;
  const doc = parseOneDocument(docStr);
  ensureHeadersArray(doc);
  return doc;
}

export function parseAllDocuments(content: string): MinimalYamlDoc[] {
  const parts = content.split(/\r?\n---\s*$/m);
  const docs: MinimalYamlDoc[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "") continue;
    const doc = parseOneDocument(part);
    ensureHeadersArray(doc);
    if (doc.info !== undefined || doc.http !== undefined) {
      docs.push(doc);
    }
  }
  return docs;
}
