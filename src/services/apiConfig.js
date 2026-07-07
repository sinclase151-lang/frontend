const rawApiUrl = import.meta.env.VITE_API_URL || "";

export const API_BASE_URL = rawApiUrl
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

export const apiUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const installApiFetchProxy = () => {
  if (!API_BASE_URL || window.__simaApiFetchProxyInstalled) return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return nativeFetch(apiUrl(input), init);
    }

    if (input instanceof Request && input.url.startsWith(window.location.origin + "/api/")) {
      const proxiedRequest = new Request(
        input.url.replace(window.location.origin, API_BASE_URL),
        input
      );
      return nativeFetch(proxiedRequest, init);
    }

    return nativeFetch(input, init);
  };

  window.__simaApiFetchProxyInstalled = true;
};
