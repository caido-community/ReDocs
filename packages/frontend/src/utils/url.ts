export const getPathFromUrl = (url: string): string => {
  if (url === undefined || url === "") return "/";

  try {
    if (url.includes("{{") && url.includes("}}")) {
      const templateEnd = url.lastIndexOf("}}");
      if (templateEnd !== -1) {
        let pathAfterTemplate = url.substring(templateEnd + 2);
        if (!pathAfterTemplate.startsWith("/")) {
          pathAfterTemplate = "/" + pathAfterTemplate;
        }
        return pathAfterTemplate;
      }
    }

    if (url.includes("://")) {
      const urlParts = url.split("://");
      if (urlParts.length > 1 && urlParts[1] !== undefined) {
        const afterProtocol = urlParts[1];
        const firstSlash = afterProtocol.indexOf("/");
        if (firstSlash !== -1) {
          return afterProtocol.substring(firstSlash);
        }
        return "/";
      }
    }

    if (url.startsWith("/")) {
      return url;
    }

    return "/" + url;
  } catch {
    return url;
  }
};
