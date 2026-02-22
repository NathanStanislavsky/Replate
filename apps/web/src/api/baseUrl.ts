const FALLBACK_PROD_API_ORIGIN = "https://replate-api.vercel.app";

function normalizeApiUrl(value: string): string {
  return value.replace(/\/api\/?$/, "") + "/api";
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured != null && String(configured).trim().length > 0) {
    return normalizeApiUrl(String(configured).trim());
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "/api";
    }
  }

  // Prevent frontend /api fallback in deployed environments.
  return normalizeApiUrl(FALLBACK_PROD_API_ORIGIN);
}
