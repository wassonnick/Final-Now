# SF-APP-13 — Notification Center Polish

Date: 2026-07-22  
Starting HEAD: `19f04633` (`sf-app-12-notification-inbox-delivery-cleanup`)

## What changed

- Upgraded the mobile notification inbox from a plain list into a filtered notification center.
- Added filters for:
  - all alerts,
  - unread alerts,
  - saved-search matches,
  - site visits,
  - listing updates.
- Added event-specific inbox card labels and actions.
- Inbox card taps now route users to the right app destination:
  - property pages,
  - society pages,
  - saved-search/search,
  - my enquiries,
  - my listings.
- App badge count now syncs from the unread notification count when the user is signed in.
- Preserved token privacy: Expo tokens remain backend-only/encrypted and are never exposed in the app.

## Validation

- `cd mobile && npm run lint`
- `cd mobile && npm run typecheck`

## Next recommended phase

- SF-APP-14: account profile polish, saved-search management, and stronger notification preferences from native UI.
- SF-APP-15: richer notification categories once broker/RWA/NRI app workflows start producing account-specific events.
