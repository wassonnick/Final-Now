type AnalyticsParams = Record<string, unknown>;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const GA_SCRIPT_ID = "societyflats-ga4";
// GA measurement IDs are public identifiers, not secrets. Keep the Render env
// override authoritative, but retain the production ID as a fail-safe because
// existing Render services do not automatically import new render.yaml env vars.
const DEFAULT_PRODUCTION_GA_MEASUREMENT_ID = "G-FC4045CRJS";
const CONFIGURED_GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || "").trim();
const GA_MEASUREMENT_ID =
  CONFIGURED_GA_MEASUREMENT_ID || (import.meta.env.PROD ? DEFAULT_PRODUCTION_GA_MEASUREMENT_ID : "");
const ANALYTICS_DEBUG = String(import.meta.env.VITE_ANALYTICS_DEBUG || "").toLowerCase() === "true";
const VALID_MEASUREMENT_ID = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";
const SAFE_QUERY_KEYS = new Set(["city", "sector", "listing_type", "type", "page", "sort", "tab", "mode", "view"]);
const PRIVATE_PARAM_KEY =
  /(^|_)(name|phone|mobile|email|message|notes?|token|password|contact|owner|admin_note|lead_name|search_query|ai_query|requirement)(_|$)/i;
const PRIVATE_VALUE = /(?:\+?\d[\d\s()-]{7,}\d|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i;

let gaInitialized = false;
let lastPageViewPath = "";

function debugLog(...args: unknown[]) {
  if (ANALYTICS_DEBUG) console.log("[SocietyFlats GA4]", ...args);
}

function cleanParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function safePagePath(value: unknown) {
  if (typeof window === "undefined") return "/";

  try {
    const parsed = new URL(String(value || "/"), window.location.origin);
    const safeSearch = new URLSearchParams();

    parsed.searchParams.forEach((parameterValue, key) => {
      if (SAFE_QUERY_KEYS.has(key) && !PRIVATE_VALUE.test(parameterValue)) {
        safeSearch.set(key, parameterValue.slice(0, 80));
      }
    });

    const query = safeSearch.toString();
    return `${parsed.pathname || "/"}${query ? `?${query}` : ""}`;
  } catch {
    return window.location.pathname || "/";
  }
}

function safeAnalyticsParams(params: AnalyticsParams = {}) {
  const safeEntries: Array<[string, string | number | boolean]> = [];

  Object.entries(params).forEach(([key, value]) => {
    if (PRIVATE_PARAM_KEY.test(key) || value === undefined || value === null || value === "") return;

    if (["page_url", "page_location", "page_path", "source_page", "path"].includes(key)) {
      const path = safePagePath(value);
      safeEntries.push([
        key === "page_url" || key === "page_location" ? "page_location" : key === "source_page" || key === "path" ? "page_path" : key,
        key === "page_url" || key === "page_location" ? `${window.location.origin}${path}` : path,
      ]);
      return;
    }

    if (typeof value === "string") {
      const cleanValue = value.trim().slice(0, 120);
      if (!cleanValue || PRIVATE_VALUE.test(cleanValue)) return;
      safeEntries.push([key, cleanValue]);
      return;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      safeEntries.push([key, value]);
      return;
    }

    if (typeof value === "boolean") safeEntries.push([key, value]);
  });

  return Object.fromEntries(safeEntries);
}

export function initGA() {
  if (typeof window === "undefined" || !VALID_MEASUREMENT_ID) return false;
  if (!import.meta.env.PROD && !ANALYTICS_DEBUG) return false;

  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      ((...args: unknown[]) => {
        window.dataLayer?.push(args);
      });

    if (!gaInitialized) {
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
      gaInitialized = true;
      debugLog("initialized", GA_MEASUREMENT_ID);
    }

    if (!document.getElementById(GA_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = GA_SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
      script.onerror = () => debugLog("gtag.js failed to load");
      document.head.appendChild(script);
    }

    return true;
  } catch (error) {
    debugLog("initialization failed", error);
    return false;
  }
}

export function trackPageView(path: string, title?: string) {
  if (typeof window === "undefined" || !VALID_MEASUREMENT_ID) return;

  try {
    const pagePath = safePagePath(path);
    if (pagePath === lastPageViewPath) return;
    lastPageViewPath = pagePath;

    const payload = safeAnalyticsParams({
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
      page_title: title,
    });

    window.gtag?.("event", "page_view", payload);
    debugLog("page_view", payload);
  } catch (error) {
    debugLog("page_view failed", error);
  }
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !VALID_MEASUREMENT_ID) return;

  try {
    const cleanName = String(eventName || "").trim().replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);
    if (!cleanName) return;

    const payload = safeAnalyticsParams(params);
    window.gtag?.("event", cleanName, payload);
    debugLog(cleanName, payload);
  } catch (error) {
    debugLog("event failed", error);
  }
}

export function getUtmParams() {
  if (typeof window === "undefined") {
    return {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_term: params.get("utm_term") || "",
    utm_content: params.get("utm_content") || "",
  };
}

export function getTrackingContext(extra: AnalyticsParams = {}) {
  const utm = getUtmParams();

  if (typeof window === "undefined") {
    return cleanParams({
      ...utm,
      ...extra,
    });
  }

  return cleanParams({
    page_url: window.location.href,
    source_page: window.location.pathname,
    path: window.location.pathname,
    referrer: document.referrer || "",
    ...utm,
    ...extra,
  });
}

export function trackLeadIntent(params: AnalyticsParams = {}) {
  trackEvent("lead_intent", getTrackingContext(params));
}

export function trackLeadSubmitted(params: AnalyticsParams = {}) {
  trackEvent("lead_submitted", getTrackingContext(params));
}

export function trackSearchPerformed(params: AnalyticsParams = {}) {
  trackEvent("search_performed", getTrackingContext(params));
}

export function trackAiPromptSubmitted(params: AnalyticsParams = {}) {
  trackEvent("ai_prompt_submitted", getTrackingContext(params));
}

export function trackResultClicked(params: AnalyticsParams = {}) {
  trackEvent("result_clicked", getTrackingContext(params));
}

export function trackIntelligenceScoreView(params: AnalyticsParams = {}) {
  trackEvent("intelligence_score_view", getTrackingContext(params));
}

export function trackScoreMethodologyOpen(params: AnalyticsParams = {}) {
  trackEvent("score_methodology_open", getTrackingContext(params));
}

export function trackSourceDrawerOpen(params: AnalyticsParams = {}) {
  trackEvent("source_drawer_open", getTrackingContext(params));
}

export function trackRiskItemExpand(params: AnalyticsParams = {}) {
  trackEvent("risk_item_expand", getTrackingContext(params));
}

export function trackCorrectionFormOpen(params: AnalyticsParams = {}) {
  trackEvent("correction_form_open", getTrackingContext(params));
}

export function trackCorrectionFormSubmit(params: AnalyticsParams = {}) {
  trackEvent("correction_form_submit", getTrackingContext(params));
}

export function trackCompareVerdictView(params: AnalyticsParams = {}) {
  trackEvent("compare_verdict_view", getTrackingContext(params));
}

export function trackHomepageIntelligenceSocietyClick(params: AnalyticsParams = {}) {
  trackEvent("homepage_intelligence_society_click", getTrackingContext(params));
}

export {};
