# SF-APP-9 — Push Token Registration + Server Notification Preferences

Date: 2026-07-22

Starting HEAD: `1aff22a9e16dba24d678aceae8b546e013634739`

## What changed

- Added backend account-device storage for mobile push registration.
- Added encrypted storage for Expo push tokens.
- Added account-protected notification APIs:
  - `GET /api/accounts/notification-preferences`
  - `PATCH /api/accounts/notification-preferences`
  - `POST /api/accounts/device-tokens`
  - `DELETE /api/accounts/device-tokens/{deviceId}`
- Added backend tests covering:
  - unauthorized access is blocked
  - mobile push token registration works
  - push tokens are not returned in API responses
  - preferences can be updated
  - devices can be disabled
- Connected the mobile Notifications screen to:
  - register a captured Expo push token when the user is signed in
  - sync saved-search, site-visit and owner-listing notification preferences
  - keep local preferences if backend sync is temporarily unavailable

## Safety notes

- Expo push tokens are encrypted at rest.
- Raw push tokens are never returned to the frontend.
- No server-side push sending is active yet.
- No automatic notification delivery was added.

## Validation

- `cd backend && php artisan route:list --path=api/accounts` — confirmed routes.
- `cd backend && php artisan test` — passed: 275 tests, 1749 assertions.
- `cd mobile && npm run typecheck` — passed.
- `cd mobile && npm run lint` — passed.

## Remaining risks / next step

- Production deploy must run the new migration.
- Native push delivery still needs EAS project ID configuration.
- Next recommended phase: `SF-APP-10 — Server Push Delivery for Site Visits + Saved Search Alerts`.
