# SF-APP-5 — Owner Listing Photo Upload

Date: 2026-07-22

Base commit before work:
- `20f4afb6 Build mobile owner listing account tracking`

## What changed

- Added Expo Image Picker support for mobile owner listing photos.
- Added mobile upload helper for `POST /api/listings/images`.
- Updated the mobile “List your property” screen to:
  - request media-library permission
  - select up to 8 listing photos
  - upload photos immediately to the backend
  - show uploaded thumbnails
  - submit uploaded image URLs with the owner listing draft

## Product and safety rules preserved

- Photos are optional.
- Listings still submit as owner-submitted drafts.
- Nothing is published from the mobile app.
- Admin verification remains required before any property becomes public.
- Backend continues to accept only SocietyFlats storage-backed listing image URLs.

## Validation

- `cd mobile && npm run typecheck` — passed
- `cd mobile && npm run lint` — passed

## Known remaining risks

- There is no upload progress bar yet.
- Failed individual image uploads show a general retry message.
- Listing drafts do not yet support removing a selected uploaded photo before submit.

## Recommended next phases

- SF-APP-6: authenticated enquiries and callbacks dashboard.
- SF-APP-7: push notification foundation.
- SF-APP-8: owner listing photo removal/progress and draft edit flow.
- SF-APP-9: app release readiness checklist.
