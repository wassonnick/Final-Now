# SF-APP-10 — Server Push Delivery

Date: 2026-07-22

Starting HEAD: `44fb20a9be34f3001d0e9893e10e61a63ce479b9`

## Goal

Connect the SF-APP-8/9 mobile notification foundation to real backend events so SocietyFlats can send Expo push notifications for high-intent moments without exposing device tokens or requiring webhook-only delivery.

## What changed

- Added `MobilePushNotificationService`.
- Added configurable push delivery settings:
  - `MOBILE_PUSH_ENABLED`
  - `EXPO_PUSH_ENDPOINT`
- Sends saved-search match alerts to active registered app devices.
- Sends site-visit reminders to matching active account devices.
- Keeps existing webhook delivery paths intact.
- Saved-search alerts are marked sent when either webhook delivery or mobile push succeeds.
- Site-visit reminders are stamped only when webhook delivery is configured or mobile push succeeds.
- Added backend coverage for saved-search push delivery and site-visit reminder push delivery.

## Safety and privacy

- Expo push tokens remain encrypted at rest through the existing `AccountDevice` model.
- Tokens are never returned to frontend APIs.
- Tokens are never logged.
- Device-level preferences are respected:
  - `saved_search_alerts`
  - `site_visit_reminders`
- Disabled devices are skipped.
- If no eligible device exists, alerts/reminders remain pending instead of being falsely marked sent.

## Validation

- `php artisan test --filter=MobilePushDeliveryTest` — passed.

Full release validation should include:

- `cd backend && php artisan test`
- `cd mobile && npm run typecheck`
- `cd mobile && npm run lint`

## Production notes

- SF-APP-9 database migration must be applied before server push delivery can use registered devices.
- Expo push delivery can be disabled with `MOBILE_PUSH_ENABLED=false`.
- The default Expo endpoint is `https://exp.host/--/api/v2/push/send`.

## Known remaining risks

- Push receipt reconciliation is not implemented yet; failed Expo tickets are counted at send time only.
- Deep-link routing from push payloads is not fully wired into the mobile app yet.
- Quiet hours / frequency caps are not implemented yet.

## Recommended next phase

SF-APP-11 — Push notification receipts, deep links, quiet hours, and preference polish.
