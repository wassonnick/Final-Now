# SF-APP-6 — Account Enquiries Dashboard

Date: 2026-07-22

Base commit before work:
- `b2a3376a Add mobile owner listing photo uploads`

## What changed

- Added a mobile account dashboard service for `GET /api/accounts/dashboard`.
- Added `/my-enquiries` mobile screen for signed-in users.
- The enquiries screen shows:
  - owner listing lead count
  - linked property count
  - upcoming/proposed site visits
  - recent owner/broker enquiry activity
- Account menu now links to “My enquiries”.
- Fixed mobile account API paths from singular `/account/...` to backend-supported `/accounts/...`.
- Added required `role: customer` to OTP request/verify payloads.
- Updated OTP token parsing to use `account_access_token`.
- Updated mobile owner listing and referral services to use protected `/accounts/...` routes where appropriate.

## Product and safety rules preserved

- Dashboard data requires the account bearer token.
- The mobile app does not expose buyer/tenant private contact details.
- Owner listings and enquiries remain review-led; nothing is published from mobile.
- Referral and owner listing activity stay tied to the signed-in account.

## Validation

- `cd mobile && npm run typecheck` — passed
- `cd mobile && npm run lint` — passed

## Known remaining risks

- OTP delivery depends on live backend provider configuration.
- The dashboard is read-only; users cannot yet cancel/edit enquiries from mobile.
- Site visit confirmation actions are not wired into mobile yet.

## Recommended next phases

- SF-APP-7: site visit confirmation/reschedule actions.
- SF-APP-8: push notification foundation.
- SF-APP-9: owner listing draft edit/remove uploaded photos.
- SF-APP-10: production app release checklist.
