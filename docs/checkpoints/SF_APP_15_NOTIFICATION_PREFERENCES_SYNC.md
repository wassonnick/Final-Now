# SF-APP-15 — Notification Preferences Sync

Date: 2026-07-22

Starting HEAD before work: `cd663978` (`sf-app-14a-expo-go-notification-guard`)

## What changed

- Added a mobile API method for `/accounts/notification-preferences`.
- Updated the mobile notifications screen to fetch account notification preferences when signed in.
- Syncs backend preferences into local mobile state for:
  - saved-search alerts;
  - site-visit reminders;
  - owner-listing updates;
  - quiet hours;
  - timezone.
- Shows active device/push-readiness status in the notifications screen.
- Moved badge-count updates through the Expo Go-safe notification helper so Android Expo Go does not import unsupported notification functionality directly.

## Preserved

- Existing notification inbox filters, deep links, mark-read, and mark-all-read behavior.
- Existing local preference fallback for signed-out/offline users.
- Existing push-token registration flow for native development builds.
- Android Expo Go guard from SF-APP-14A.

## Validation

- `cd mobile && npm run typecheck` — passed.
- `cd mobile && npm run lint` — passed.

## Known remaining risks

- Android remote push still requires an EAS development build or production build; Expo Go can preview in-app flows only.
- Preference updates are device-backed on the backend, so accounts with no registered device can store local preferences but may show zero active push devices until push registration succeeds.
- Future app phases should add a dedicated account preferences screen once profile editing expands beyond notification controls.

## Next recommended phases

- SF-APP-16 — backend-synced saved societies/properties and richer mobile shortlist payloads.
- SF-APP-17 — mobile maps and compare polish.
- SF-APP-18 — mobile NRI/RWA module screens.
