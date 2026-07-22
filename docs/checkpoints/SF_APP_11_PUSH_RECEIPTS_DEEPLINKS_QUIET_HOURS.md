# SF-APP-11 — Push Receipts, Deep Links, and Quiet Hours

Date: 2026-07-22

Starting HEAD: `ed66ee4c0bdb12cdb4acbd260819a1da61491d3b`

## Goal

Polish the mobile push notification foundation so delivery is safer, traceable, and less intrusive for users.

## What changed

- Added quiet-hours settings to registered account devices.
- Added backend validation and account preference APIs for:
  - `quiet_hours_enabled`
  - `quiet_hours_start`
  - `quiet_hours_end`
  - `timezone`
- Server push delivery now skips eligible devices during quiet hours instead of pushing immediately.
- Added `account_device_push_receipts` for safe provider ticket tracking.
- Saved Expo ticket IDs and send statuses without storing or exposing device tokens.
- Added `mobile-push:check-receipts` command.
- Scheduled push receipt checks every 30 minutes.
- Added mobile notification tap routing:
  - property notification → property detail
  - society notification → society detail
  - saved-search notification → search screen
  - site-visit reminder → enquiries screen
  - fallback → notifications screen
- Added quiet-hours UI on the mobile Notifications screen.

## Safety and privacy

- Expo push tokens remain encrypted and hidden.
- Tokens are never written to push receipt rows.
- Receipt logs store ticket IDs, event type, safe status/error information, and device/account IDs only.
- Quiet hours are device-level so users can keep one phone quieter than another.

## Validation

- `php artisan test --filter=MobilePushDeliveryTest` — passed.
- `php artisan test --filter=AccountNotificationPreferencesTest` — passed.
- `cd mobile && npm run typecheck` — passed.

Full release validation should include:

- `cd backend && php artisan test`
- `cd mobile && npm run lint`

## Production notes

- Run migrations before relying on quiet hours or receipt tracking.
- Default Expo receipt endpoint:
  - `https://exp.host/--/api/v2/push/getReceipts`
- Receipt checking is intentionally conservative and does not disable devices automatically yet.

## Known remaining risks

- Device cleanup for `DeviceNotRegistered` receipts is not automatic yet.
- Quiet-hours skipped notifications are left pending; a future phase can add delayed re-delivery.
- Rich in-app notification inbox history is not implemented yet.

## Recommended next phase

SF-APP-12 — In-app notification inbox, failed-device cleanup, delayed quiet-hours delivery, and richer push deep-link analytics.
