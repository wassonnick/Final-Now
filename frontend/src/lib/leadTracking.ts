import { getTrackingContext } from "./analytics";

export type LeadTrackingContext = {
  page_url?: string;
  source_page?: string;
  path?: string;
  referrer?: string;
  cta_label?: string;
  lead_intent?: string;
  search_query?: string;
  ai_query?: string;
  entity_type?: string;
  entity_slug?: string;
  entity_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

export function buildLeadTrackingContext(context: LeadTrackingContext = {}) {
  return getTrackingContext(context) as LeadTrackingContext;
}

export function cleanLeadTrackingPayload(context: LeadTrackingContext = {}) {
  return Object.fromEntries(
    Object.entries(buildLeadTrackingContext(context)).filter(
      ([, value]) => value !== undefined && value !== null && String(value).trim() !== "",
    ),
  ) as LeadTrackingContext;
}
