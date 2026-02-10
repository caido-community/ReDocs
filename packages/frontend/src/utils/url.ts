const FALLBACK_BASE = "http://_";

export const getPathFromUrl = (url: string): string => {
  if (url === undefined || url === "") return "/";

  const trimmed = url.trim();
  if (trimmed === "") return "/";

  if (trimmed.includes("{{") && trimmed.includes("}}")) {
    const templateEnd = trimmed.lastIndexOf("}}");
    if (templateEnd !== -1) {
      let pathAfterTemplate = trimmed.substring(templateEnd + 2).trim();
      if (pathAfterTemplate !== "" && !pathAfterTemplate.startsWith("/")) {
        pathAfterTemplate = "/" + pathAfterTemplate;
      }
      return pathAfterTemplate === "" ? "/" : pathAfterTemplate;
    }
  }

  try {
    /* eslint-disable compat/compat */
    const parsed =
      trimmed.startsWith("/") || !trimmed.includes("://")
        ? new URL(trimmed, FALLBACK_BASE)
        : new URL(trimmed);
    /* eslint-enable compat/compat */
    const pathname = parsed.pathname;
    const search = parsed.search;
    return pathname === "" ? "/" : pathname + search;
  } catch {
    if (trimmed.startsWith("/")) return trimmed;
    return "/" + trimmed;
  }
};
