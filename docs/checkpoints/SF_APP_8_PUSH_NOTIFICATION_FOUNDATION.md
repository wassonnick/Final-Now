# SF-APP-8 — Mobile Push Notification Foundation

Date: 2026-07-22

Starting HEAD: `b9fb05e946dd8ca6171d790115d4da7df63fb180`

## What changed

- Added Expo SDK 54-compatible notification dependencies:
  - `expo-notifications`
  - `expo-device`
- Registered the `expo-notifications` config plugin in the mobile app config.
- Added a global notification handler foundation for foreground notification behavior.
- Added a secure local notification preference store.
- Added notification preferences for:
  - Saved searches
  - Site visit reminders
  - Owner listing updates
- Added device permission request flow from the mobile Notifications screen.
- Captures the Expo push token into SecureStore when available.
- Does not display or log push tokens.
- Handles safe fallback states:
  - Simulator/non-physical device
  - Permission denied
  - Missing EAS project ID

## What is intentionally not included yet

- No backend push-token registration endpoint.
- No server-side push notification sender.
- No automatic notification delivery.
- No SMS/WhatsApp notification changes.

## Validation

- `cd mobile && npm run typecheck` — passed.
- `cd mobile && npm run lint` — passed.

## Remaining risks / next step

- Native push delivery needs an EAS project ID and a backend endpoint to register device tokens against an account/user.
- Next recommended phase: `SF-APP-9 — Push Token Registration + Server Notification Preferences`.
