type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsConsent = "granted" | "denied";

export type ConsentPreferences = {
  analytics: AnalyticsConsent;
  advertising: AnalyticsConsent;
  updatedAt: string;
};

const GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || "").trim();
const ANALYTICS_DEBUG = String(import.meta.env.VITE_ANALYTICS_DEBUG || "").toLowerCase() === "true";
const CONSENT_STORAGE_KEY = "societyflats_analytics_consent_v1";
const GA_SCRIPT_ID = "societyflats-ga4";

let initialized = false;
let lastPageView = "";

function cleanParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function debugLog(message: string, payload?: unknown) {
  if (!ANALYTICS_DEBUG || !import.meta.env.DEV) {
    return;
  }

  if (payload === undefined) {
    console.info(`[SocietyFlats analytics] ${message}`);
    return;
  }

  console.info(`[SocietyFlats analytics] ${message}`, payload);
}

function ensureGtag() {
  if (typeof window === "undefined") {
    return false;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });

  return true;
}

function isConsentPreferences(value: unknown): value is ConsentPreferences {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ConsentPreferences>;
  return (
    (candidate.analytics === "granted" || candidate.analytics === "denied")
    && (candidate.advertising === "granted" || candidate.advertising === "denied")
    && typeof candidate.updatedAt === "string"
  );
}

export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) {
      return null;
    }

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
  if (typeof window === "undefined") {
    return;
  }

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
  if (
    initialized
    || typeof window === "undefined"
    || !GA_MEASUREMENT_ID
  ) {
    return;
  }

  initialized = true;

  try {
    if (!ensureGtag()) {
      return;
    }

    const storedConsent = getConsentPreferences();
    window.gtag?.("consent", "default", {
      ...consentCommand(storedConsent),
      wait_for_update: storedConsent ? 0 : 500,
    });
    window.gtag?.("set", "ads_data_redaction", true);
    window.gtag?.("set", "url_passthrough", false);
    window.gtag?.("js", new Date());
    window.gtag?.("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    if (!document.getElementById(GA_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = GA_SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
      script.onerror = () => debugLog("gtag.js failed to load");
      document.head.appendChild(script);
    }

    debugLog("initialized", {
      consent: consentCommand(storedConsent),
    });
  } catch {
    // Analytics must never interrupt the SocietyFlats experience.
  }
}

export function trackPageView(path: string, title?: string) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (lastPageView === normalizedPath) {
    return;
  }

  lastPageView = normalizedPath;
  const payload = cleanParams({
    page_path: normalizedPath,
    page_location: `${window.location.origin}${normalizedPath}`,
    page_title: title || document.title,
  });

  window.gtag("event", "page_view", payload);
  debugLog("page_view", payload);
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

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  const payload = cleanParams(params);

  if (GA_MEASUREMENT_ID && typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, payload);
  }

  debugLog(name, payload);
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
