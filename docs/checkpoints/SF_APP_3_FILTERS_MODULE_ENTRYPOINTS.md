# SF-APP-3 — Filters, Saved Searches, and Module Entrypoints

Date: 2026-07-22  
Base commit before this phase: `d09b9c60` (`sf-app-2-real-api-experience`)

## What changed

- Added persistent mobile Explore filter state:
  - Societies / Properties mode
  - query
  - listing type: Any / Rent / Sale
  - high-score filter
  - with-homes filter
  - sort preference
- Wired Explore filters into real API calls where supported.
- Rebuilt `/filters` from a static placeholder into a functional filter panel.
- Added saved-search storage using Expo SecureStore.
- Added “Save this search” on mobile search.
- Surfaced saved searches in Saved and Notifications.
- Added mobile NRI module page with a real `/nri-cases` submission form.
- Added mobile referral partner page using existing authenticated `/referrals` APIs.
- Added mobile RWA portal entry page to frame claims, announcements, Q&A, grievances, and moderated discussion.
- Added Home journey strips for:
  - NRI management
  - RWA portal
  - Referral partner
  - Builder floors / verified inventory exploration

## Preserved

- No web/backend changes.
- No fake property cards or fake inventory.
- Existing Expo SDK 54 compatibility.
- Existing public API publication filters.
- Referral submissions remain account-authenticated.
- NRI requests keep the existing legal/tax/FEMA disclaimer behavior.

## Validation

- `cd mobile && npm run typecheck` — passed.
- `cd mobile && npm run lint` — passed.

## Known remaining risks / next work

- Saved searches are local-only; server-side alerts need account-backed saved-search endpoints.
- RWA mobile is an entry page; claim/thread workflows can be wired deeper in SF-APP-4/5.
- Referral form requires login because backend referral APIs require an account token.
- Explore sort is partly client-side until backend exposes richer sort/filter params.
- Push notifications are not enabled yet.

## Recommended next phases

1. SF-APP-4 — Account-linked enquiries and enquiry history.
2. SF-APP-5 — Deep RWA mobile claim/thread flows.
3. SF-APP-6 — Server-backed saved searches and push notifications.
4. SF-APP-7 — EAS build profiles and test release.
