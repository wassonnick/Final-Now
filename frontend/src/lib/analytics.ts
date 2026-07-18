type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function cleanParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
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

  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, payload);
  }

  if (import.meta.env.DEV) {
    console.info("[SocietyFlats analytics]", name, payload);
  }
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
