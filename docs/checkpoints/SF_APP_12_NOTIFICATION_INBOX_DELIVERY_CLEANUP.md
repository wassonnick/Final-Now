# SF-APP-12 — Notification Inbox + Delivery Cleanup

Date: 2026-07-22  
Starting HEAD: `b8c70b45` (`sf-app-11-push-receipts-deeplinks-quiet-hours`)

## What changed

- Added account notification inbox storage for mobile users.
- Added authenticated mobile API endpoints to:
  - list latest account notifications,
  - mark one notification as read,
  - mark all notifications as read.
- Mobile push sends now also create an in-app notification, so alerts remain visible even if device push is disabled, unavailable, or quiet-hours delayed.
- Quiet-hours pushes are now stored as deferred push receipts instead of being only skipped.
- Added `mobile-push:flush-deferred` and scheduled it every 15 minutes to send deferred alerts after quiet hours.
- Expo receipt failures with `DeviceNotRegistered` now disable the stale device token without logging or exposing the token.
- Mobile Notifications screen now shows a signed-in notification inbox with unread count and mark-as-read actions.

## Safety / privacy

- Expo push tokens remain encrypted on the backend and hidden from API responses.
- Push receipts and account notifications store only safe event metadata, title/body copy, and route payloads.
- Invalid Expo devices are disabled automatically; tokens are not printed in logs or returned to the app.
- Quiet-hours delivery preserves the user preference while still keeping the notification visible inside the app.

## Validation

- Targeted backend tests:
  - `php artisan test --filter=MobilePushDeliveryTest`
  - `php artisan test --filter=AccountNotificationPreferencesTest`
- Mobile:
  - `npm run typecheck`

Full validation should be run before release:

- `cd backend && php artisan test`
- `cd mobile && npm run lint`
- `cd mobile && npm run typecheck`

## Next recommended phase

- SF-APP-13: richer app notification center filters, deep-link-specific notification cards, and optional badge count sync.
- SF-APP-14: app account profile polish and saved-search preference editing from native UI.
