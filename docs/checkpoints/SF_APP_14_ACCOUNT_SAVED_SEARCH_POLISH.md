# SF-APP-14 — Account + Saved Search Polish

Date: 2026-07-22

Starting HEAD before work: `2ed6d92b` (`sf-app-13-notification-center-polish`)

## What changed

- Added a mobile saved-search API service for the existing Laravel account saved-search endpoints.
- Updated mobile search so “Save this search” keeps a local fallback and syncs to account saved-search alerts when the user is signed in.
- Rebuilt the mobile Saved tab into a real shortlist/alert manager:
  - signed-out users see local saved searches and can remove/open them;
  - signed-in users see account saved-search alerts from the backend;
  - users can pause/resume or delete saved-search alerts;
  - saved societies and saved homes remain visible as private shortlist links.
- Polished the mobile Account tab with profile identity, logout, unread alert count, saved-search count, and saved-item count.

## Preserved

- Existing mobile Expo SDK 54 app foundation.
- Existing backend account saved-search implementation and validation.
- Existing local saved society/property behavior.
- Notification inbox/deep-link/badge behavior from SF-APP-13.

## Validation

- `cd mobile && npm run typecheck` — passed.
- `cd mobile && npm run lint` — passed.
- `cd backend && php artisan test --filter=SavedSearchFlowTest` — passed (`1 test`, `9 assertions`).

## Known remaining risks

- Saved society/property links still use locally stored IDs/slugs; a future mobile pass should normalize saved payloads from backend account APIs.
- Saved-search alerts currently default to WhatsApp/daily to match backend validation; push/email preference UI can be expanded in a later phase.
- Account dashboard stats depend on successful login/account API state in the deployed backend.

## Next recommended phases

- SF-APP-15 — native account preferences, saved society/property backend sync, and alert-channel preference UI.
- SF-APP-16 — mobile maps and society comparison deep-link polish.
- SF-APP-17 — NRI/RWA module screens in the mobile app.
