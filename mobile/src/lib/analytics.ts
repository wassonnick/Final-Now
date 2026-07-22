import { env } from '../config/env';

export type AnalyticsEvent =
  | 'app_open'
  | 'onboarding_complete'
  | 'search_started'
  | 'society_viewed'
  | 'property_viewed'
  | 'society_saved'
  | 'property_saved'
  | 'callback_requested'
  | 'whatsapp_clicked'
  | 'society_context_opened'
  | 'advisor_started'
  | 'compare_society_added'
  | 'compare_advisor_started'
  | 'list_property_started';

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

function scrub(payload: AnalyticsPayload = {}): AnalyticsPayload {
  const blocked = ['token', 'phone', 'email', 'name', 'message', 'password'];
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !blocked.some((word) => key.toLowerCase().includes(word))),
  );
}

export const analytics = {
  track(event: AnalyticsEvent, payload?: AnalyticsPayload) {
    if (__DEV__ && env.enableDevAnalytics) {
      console.log('[analytics]', event, scrub(payload));
    }
  },
};
