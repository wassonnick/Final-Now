const DEFAULT_API_BASE_URL = "https://final-now.onrender.com/api";
const SOCIETYFLATS_HOST_PATTERN = /^(www\.)?societyflats\.com$/i;

function normalizeApiBaseUrl(value: unknown) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isSocietyFlatsProductionHost() {
  return (
    typeof window !== "undefined" &&
    SOCIETYFLATS_HOST_PATTERN.test(window.location.hostname)
  );
}

// VITE_API_URL is retained here only as a temporary compatibility bridge for
// older deployments. New configuration must use VITE_API_BASE_URL.
export const API_BASE_URL = normalizeApiBaseUrl(
  isSocietyFlatsProductionHost()
    ? "/api"
    : import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_API_URL ||
        DEFAULT_API_BASE_URL,
);
