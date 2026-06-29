const DEFAULT_API_BASE_URL = "https://final-now.onrender.com/api";

function normalizeApiBaseUrl(value: unknown) {
  return String(value || "").trim().replace(/\/+$/, "");
}

// VITE_API_URL is retained here only as a temporary compatibility bridge for
// older deployments. New configuration must use VITE_API_BASE_URL.
export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    DEFAULT_API_BASE_URL,
);

