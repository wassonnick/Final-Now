# SocietyFlats analytics consent

SocietyFlats uses Google Analytics 4 with Google Consent Mode v2.

## Environment

Set these variables on the frontend service and redeploy:

```text
VITE_GA_MEASUREMENT_ID=G-FC4045CRJS
VITE_ANALYTICS_DEBUG=false
```

Use `VITE_ANALYTICS_DEBUG=true` only during local development when event logging is needed.

## Consent behavior

- Before a visitor chooses, `analytics_storage`, `ad_storage`, `ad_user_data`, and
  `ad_personalization` default to `denied`.
- **Essential only** keeps every optional consent signal denied.
- **Allow analytics** grants only `analytics_storage`.
- Advertising storage, advertising user data, and advertising personalization remain denied.
- Google Signals and ad-personalization signals are disabled in the GA configuration.
- The selection is stored in the visitor's browser under
  `societyflats_analytics_consent_v1`.

The application sends only safe page and product metadata to GA. Names, phone numbers,
email addresses, enquiry text, admin tokens, lead notes, and private inventory data must
never be added to analytics events.

## Verification

1. Open the live site in a private browser window.
2. In browser developer tools, confirm the initial consent command has denied values.
3. Select **Allow analytics** and confirm a consent update grants only
   `analytics_storage`.
4. Navigate between public pages and verify one `page_view` per route in GA Realtime or
   DebugView.
5. In GA Admin → Consent settings, allow up to 24–48 hours for consent-signal status to
   update.
