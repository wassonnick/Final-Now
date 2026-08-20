type AnalyticsParams = Record<string, unknown>;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export type AnalyticsConsent = "granted" | "denied";

export type ConsentPreferences = {
  analytics: AnalyticsConsent;
  advertising: AnalyticsConsent;
  updatedAt: string;
};

const GA_SCRIPT_ID = "societyflats-ga4";
const CONSENT_STORAGE_KEY = "societyflats_analytics_consent_v1";
// GA measurement IDs are public identifiers, not secrets. Keep the Render env
// override authoritative, but retain the production ID as a fail-safe because
// existing Render services do not automatically import new render.yaml env vars.
const DEFAULT_PRODUCTION_GA_MEASUREMENT_ID = "G-FC4045CRJS";
const CONFIGURED_GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || "").trim();
const GA_MEASUREMENT_ID =
  CONFIGURED_GA_MEASUREMENT_ID || (import.meta.env.PROD ? DEFAULT_PRODUCTION_GA_MEASUREMENT_ID : "");
const ANALYTICS_DEBUG = String(import.meta.env.VITE_ANALYTICS_DEBUG || "").toLowerCase() === "true";
const VALID_MEASUREMENT_ID = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";

/**
 * Analytics is off until there is enough traffic for it to say anything.
 *
 * At a handful of visitors a day GA answers nothing that Search Console does not answer
 * better, and it charges a consent banner across the bottom of every page to do it — on a
 * site whose whole problem is converting its first visitors. Off by default and switched
 * on with VITE_ANALYTICS_ENABLED=true, so a missing variable means no tracking rather than
 * silent tracking.
 *
 * This flag governs the banner and the script together, deliberately. Hiding the banner on
 * its own would leave GA loaded with consent defaulted to denied — Google's script running
 * on every page, collecting nothing, forever, and no notice shown for it.
 */
const ANALYTICS_ENABLED = String(import.meta.env.VITE_ANALYTICS_ENABLED || "").toLowerCase() === "true";

/** The single condition every entry point checks: switched on, and pointed somewhere real. */
const ANALYTICS_ACTIVE = ANALYTICS_ENABLED && VALID_MEASUREMENT_ID;

/**
 * Whether anything analytics-related should appear or run.
 *
 * Read by the consent banner so notice and collection can never disagree: no banner
 * without collection, and no collection without a banner.
 */
export function analyticsIsActive(): boolean {
  return ANALYTICS_ACTIVE;
}
const SAFE_QUERY_KEYS = new Set(["city", "sector", "listing_type", "type", "page", "sort", "tab", "mode", "view"]);
const PRIVATE_PARAM_KEY =
  /(^|_)(name|phone|mobile|email|message|notes?|token|password|contact|owner|admin_note|lead_name|search_query|ai_query|requirement)(_|$)/i;
const PRIVATE_VALUE = /(?:\+?\d[\d\s()-]{7,}\d|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i;

let gaInitialized = false;
let lastPageViewPath = "";

function debugLog(...args: unknown[]) {
  if (ANALYTICS_DEBUG && import.meta.env.DEV) console.log("[SocietyFlats GA4]", ...args);
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

function ensureGtag() {
  if (typeof window === "undefined") return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(..._args: unknown[]) {
      // Match Google's loader exactly: gtag commands are pushed as the
      // function's Arguments object, then consumed when gtag.js is ready.
      window.dataLayer?.push(arguments);
    };

  return true;
}

function isConsentPreferences(value: unknown): value is ConsentPreferences {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ConsentPreferences>;
  return (
    (candidate.analytics === "granted" || candidate.analytics === "denied")
    && (candidate.advertising === "granted" || candidate.advertising === "denied")
    && typeof candidate.updatedAt === "string"
  );
}

export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    return isConsentPreferences(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function consentCommand(preferences: ConsentPreferences | null) {
  const analytics = preferences?.analytics || "denied";
  const advertising = preferences?.advertising || "denied";

  return {
    analytics_storage: analytics,
    ad_storage: advertising,
    ad_user_data: advertising,
    ad_personalization: advertising,
  };
}

export function updateConsentPreferences(
  analytics: AnalyticsConsent,
  advertising: AnalyticsConsent = "denied",
) {
  if (typeof window === "undefined") return;

  const preferences: ConsentPreferences = {
    analytics,
    advertising,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Consent still applies to the current page when storage is unavailable.
  }

  if (ensureGtag()) {
    window.gtag?.("consent", "update", consentCommand(preferences));
  }

  window.dispatchEvent(new CustomEvent("societyflats:consent-updated", { detail: preferences }));
  debugLog("consent updated", {
    analytics: preferences.analytics,
    advertising: preferences.advertising,
  });
}

export function initGA() {
  if (typeof window === "undefined" || !ANALYTICS_ACTIVE) return false;
  if (!import.meta.env.PROD && !ANALYTICS_DEBUG) return false;

  try {
    if (!ensureGtag()) return false;

    if (!gaInitialized) {
      const storedConsent = getConsentPreferences();
      const initialPagePath = safePagePath(`${window.location.pathname}${window.location.search}`);
      window.gtag?.("consent", "default", {
        ...consentCommand(storedConsent),
        wait_for_update: storedConsent ? 0 : 500,
      });
      window.gtag?.("set", "ads_data_redaction", true);
      window.gtag?.("set", "url_passthrough", false);
      // Google sends the first page_view from the config command. Seed the
      // de-duplication guard so the route tracker does not send it twice.
      lastPageViewPath = initialPagePath;
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: initialPagePath,
        page_location: `${window.location.origin}${initialPagePath}`,
        page_title: document.title,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      gaInitialized = true;
      debugLog("initialized with first page_view", GA_MEASUREMENT_ID, initialPagePath, consentCommand(storedConsent));
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
  if (typeof window === "undefined" || !ANALYTICS_ACTIVE) return;

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
  if (typeof window === "undefined" || !ANALYTICS_ACTIVE) return;

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
  const payload = getTrackingContext({
    ...params,
    page_path:
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : undefined,
  });

  // Retain the existing funnel event while also emitting GA4's recommended
  // lead conversion event for Realtime, attribution and key-event reporting.
  trackEvent("lead_submitted", payload);
  trackEvent("generate_lead", payload);
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
