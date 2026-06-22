# SocietyFlats feature-document gap audit

Source reviewed: `SocietyFlats_Feature_Documentation.docx` (23 June 2026 audit).

The document repeatedly labels features “BUILT & DEPLOYED”, but several are stubs, local-browser fallbacks, or absent. Code and database migrations are treated as the source of truth.

## Confirmed working foundations

- Society, property, lead and account data models with admin CRUD.
- Draft-first society imports, source enrichment, duplicate protection and publish controls.
- Public society/property filtering, maps, SEO metadata/prerendering, compare and AI advisor flows.
- Account OTP/token flow, admin bearer-token protection, owner/broker dashboards and lead CRM.
- Clean launch inventory protection: draft/unpublished records remain private.

## Completed in this implementation

- Verified resident reviews: database tables, account-token submission, moderation, approved-only public display, aggregate ratings and helpful voting.
- Saved searches: account-scoped persistence, search-page save action, dashboard management and alert preferences.
- Enhanced property details: full-screen gallery/lightbox, sale EMI calculator, virtual-tour and floor-plan fields/CTAs.
- Dormant AI recommendation and rent-estimate controller methods are now routed.
- Site visits: admin slot proposals, private visitor confirmation, lead follow-up synchronization, reminders and completion/cancellation tracking.
- Investment intelligence: gross/net yield, payback, multi-year value/rent projection, total ROI, CAGR, live society ranking and locality reference ranges.
- Builder-floor discovery: dedicated SEO page, live builder-floor inventory, apartment comparison and due-diligence guidance.

## Partially implemented

- Advanced search and recommendations exist in the public React experience, but the legacy `SearchController` does not match the active schema and remains intentionally unrouted.
- Owner listing and dashboards work through leads/account-scoped APIs; direct owner editing/deletion of approved property records is not enabled.
- Broker CRM has strong lead/admin workflows, but no separate deal/commission model.
- Analytics are primarily client/admin lead summaries; there is no durable page-view/conversion analytics backend.
- WhatsApp-ready notifications and OTP provider abstraction exist, but production delivery depends on configured external credentials.
- Image handling supports approved uploads, Google Places references and safe placeholders; automatic Unsplash fallback is not implemented because licensing/attribution review is required.

## Not implemented yet

- Razorpay order creation, signature verification, payment plans and payment ledger.
- AI chat proxy with a conversational provider; the current chat surface submits leads/callback requests.
- Scheduled daily saved-search matching and outbound alert delivery.
- Weekly rent scraping, rent-history storage and 12-month charts.
- AI rental-agreement drafting and PDF workflow.
- Builder/RWA claims, announcements, review responses and official-document portal.
- Tenant document verification, scoring tiers and shareable verification profiles.
- Email/password customer authentication and a global React AuthContext; the active implementation is OTP/account-token based.

## Documentation corrections

- Active frontend package is React 18, not React 19.
- Active backend package is Laravel 13, not Laravel 12.
- Society import enrichment uses Gemini when configured, not Anthropic Claude.
- Public deployment API currently resolves through `https://final-now.onrender.com/api`; `render.yaml` contains older service-domain values that should be reconciled separately.
