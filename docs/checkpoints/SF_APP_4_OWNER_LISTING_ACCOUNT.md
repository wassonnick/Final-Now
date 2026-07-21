# SF-APP-4 — Owner Listing + Account Tracking

Date: 2026-07-22

Base commit before work:
- `2a73272a Build mobile filters and module entrypoints`

## What changed

- Replaced the mobile “List your property” placeholder with a real text-first owner listing submission flow.
- Added mobile API service for:
  - `POST /api/listings`
  - `GET /api/account/listings`
- Added `/my-listings` mobile screen for signed-in users to track owner-submitted listing status.
- Added account menu links for:
  - My listings
  - List your property
  - NRI cases
  - RWA claims
  - Referral partner
  - Notification preferences
- Registered the new route in the Expo app layout.

## Product rule preserved

- Owner-submitted listings remain private until SocietyFlats admin review.
- Mobile listing submission does not publish inventory directly.
- Photo upload is still optional; text-first draft submission is allowed.
- Public property publishing remains controlled by backend/admin verification.

## Validation

- `cd mobile && npm run typecheck` — passed
- `cd mobile && npm run lint` — passed

## Known remaining risks

- Mobile image upload for owner listings is not implemented yet.
- OTP delivery depends on the live backend account/OTP configuration.
- The listing form is intentionally minimal and should later support society search/autocomplete.

## Recommended next phases

- SF-APP-5: owner listing image upload + upload progress.
- SF-APP-6: authenticated enquiries dashboard.
- SF-APP-7: push notification foundation.
- SF-APP-8: app release readiness checklist.
