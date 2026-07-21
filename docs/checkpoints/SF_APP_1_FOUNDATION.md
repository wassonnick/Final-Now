# SF-APP-0 / SF-APP-1 — SocietyFlats Mobile Application Foundation

Date: 2026-07-22  
Branch: `main`

## Scope completed

- Created a new top-level `mobile/` Expo React Native app, separate from the existing web frontend.
- Added Expo Router navigation with:
  - onboarding entry
  - five-tab shell: Home, Explore, Saved, Advisor, Account
  - route foundations for society detail, property detail, search, filters, compare, login, OTP, list property, and notifications.
- Added a mobile design foundation:
  - SocietyFlats theme tokens
  - warm paper surfaces
  - pine/clay accents
  - reusable mobile UI components
  - card, badge, button, empty/loading/error state foundations.
- Added API and state foundations:
  - central Axios client
  - API base URL from Expo env/config
  - timeout handling
  - Laravel validation error normalization
  - auth token injection from Expo SecureStore
  - 401 hook for future refresh/logout behavior
  - privacy-safe dev logging without token output
  - TanStack Query setup
  - Zustand auth and onboarding stores.
- Added service modules for:
  - societies
  - properties
  - search
  - auth / OTP
  - leads
  - AI advisor
  - saved items placeholder
  - user profile placeholder.
- Added docs:
  - `mobile/README.md`
  - `docs/mobile-app-architecture.md`
  - `docs/mobile-api-audit.md`
  - `docs/mobile-release-checklist.md`

## API audit highlights

The mobile app is wired around current SocietyFlats public and account APIs:

- Public discovery:
  - `/api/societies`
  - `/api/societies/{idOrSlug}`
  - `/api/properties`
  - `/api/properties/{idOrSlug}`
  - `/api/compare-pages`
  - `/api/ai/advisor`
- Account/auth foundation:
  - `/api/account/request-otp`
  - `/api/account/verify-otp`
  - `/api/account/me`
  - `/api/account/dashboard`
  - `/api/account/listings`
- Lead capture:
  - `/api/leads`
  - `/api/nri-cases`

Mock data is isolated in `mobile/src/data/mockData.ts` and is used only as a development fallback for early app rendering.

## Validation run

Passed:

- `cd mobile && npm run typecheck`
- `cd mobile && npm run lint`
- `cd backend && php artisan test`
  - 271 tests passed
  - 1,733 assertions
- `cd frontend && npm run seo:validate`
- `cd frontend && npm run build`

Expo Doctor:

- `cd mobile && npm run doctor` with network access reached `19/20` checks passed.
- The remaining failure is environmental, not inside `mobile/`:
  - Expo Doctor detects a second React install at `/Users/wasson/node_modules/react@19.2.6`.
  - The mobile app itself has a single React install: `react@19.2.3`.
  - `cd mobile && npm ls react --all` shows only `react@19.2.3` inside the mobile dependency tree.

Recommended resolution before tagging a fully clean mobile release:

- Remove or move the unrelated parent `/Users/wasson/node_modules` install, or run mobile builds in a project directory that has no parent `node_modules`.
- Do not commit/tag as fully verified until Expo Doctor passes without the parent duplicate warning.

## Preserved existing work

Pre-existing sitemap changes were already present before mobile work and were preserved:

- `backend/routes/api.php`
- `backend/tests/Feature/SeoAutopilotTest.php`

These are not part of the mobile app foundation and should be committed separately from the mobile release if desired.

## Next recommended phase: SF-APP-2

- Connect real OTP login end-to-end on device.
- Add saved societies/properties persistence through account APIs.
- Build production filters and sort UI.
- Add compare shortlist flow.
- Add RWA/NRI/referral deep links and richer native entry points.
- Add push notification scaffolding only after product flows are ready.
