# Google Analytics 4

SocietyFlats uses Google Analytics 4 (GA4) for privacy-safe public journey and conversion measurement. The integration is frontend-only and becomes active only when a valid GA4 Measurement ID is present in a production build.

## Create the GA4 property

1. Open [Google Analytics](https://analytics.google.com/) and create or select the SocietyFlats GA4 property.
2. Go to **Admin → Data collection and modification → Data streams**.
3. Create a **Web** stream for `https://www.societyflats.com`, or open the existing web stream.
4. Copy the Measurement ID shown in the stream details. It starts with `G-`.

## Render environment variables

Add this build-time environment variable to the Render frontend/static-site service:

```text
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

The live SocietyFlats measurement ID is also retained as a production-only
fail-safe in the analytics helper. The Render variable remains authoritative,
but tracking will not silently disappear if an existing Render service misses
a `render.yaml` environment update. Measurement IDs are public identifiers;
no Analytics credentials or private data are embedded in the frontend.

Replace the example with the real Measurement ID, then redeploy the frontend. Vite embeds `VITE_` variables at build time, so saving the environment variable without a new deployment is not enough.

Optional local diagnostics:

```text
VITE_ANALYTICS_DEBUG=true
```

Debug mode prints safe GA initialization and event payloads in the browser console. Leave it unset or `false` in production.

## What is measured

- One `page_view` for the initial public route and each distinct SPA route.
- Successful public leads (`generate_lead`).
- WhatsApp and phone CTA clicks.
- Successful owner property submissions.
- AI Advisor searches without sending the typed query.
- Society comparisons and published comparison views.
- Public property and society detail views.

The analytics utility filters private field names and values. Names, phones, email addresses, messages, notes, tokens, owner contacts, and raw search/AI queries are not sent to GA.

## Test the integration

1. Deploy the frontend with the real Measurement ID.
2. Open **Google Analytics → Reports → Realtime**.
3. Visit SocietyFlats in a private browser window and navigate across two or three public routes.
4. Trigger a safe test action such as opening a society, comparing societies, or clicking a contact CTA.
5. Confirm the page and event activity appears in Realtime. GA can take a short time to show a new stream for the first time.

For local testing, set both `VITE_GA_MEASUREMENT_ID` and `VITE_ANALYTICS_DEBUG=true`, restart Vite, and inspect the browser console. The GA script is not initialized in ordinary development mode unless debug is explicitly enabled.
