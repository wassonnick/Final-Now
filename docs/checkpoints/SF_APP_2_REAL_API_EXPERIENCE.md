# SF-APP-2 — Real API Mobile Experience Foundation

Date: 2026-07-22  
Base commit before this phase: `b003e428` (`sf-app-sdk54-expo-go-compatible`)

## What changed

- Replaced mobile home/explore mock fallbacks with honest live API rendering.
- Added central API normalizers for public society and property payloads.
- Improved property price formatting with rupee symbol and lakh/crore units.
- Added SocietyFlats-branded placeholder visuals for missing/unverified photos.
- Expanded society detail pages with:
  - verified profile badge
  - score panel
  - builder/location/home count fields
  - description
  - approved amenities
  - request availability lead form
- Expanded property detail pages with:
  - gallery/placeholder hero
  - source-reviewed badge
  - price panel
  - key listing facts
  - lead capture form
  - WhatsApp CTA tracking
  - society context navigation
  - safety reminder
- Added local saved society/property shortlist using Expo SecureStore.
- Restored saved items during app boot.
- Added no-fake-results search empty states.

## Preserved

- Expo SDK 54 compatibility for the user's installed Expo Go client.
- Existing Laravel public API routes and publication filters.
- Existing web/frontend/backend behavior.
- Manual lead capture through the existing `/api/leads` endpoint.
- No fake public property cards when the API has no inventory.

## Validation

- `cd mobile && npm run typecheck` — passed.
- `cd mobile && npm run lint` — passed.

## Known remaining risks / next work

- Saved items are local-only until backend customer saved-item endpoints are added.
- Mobile lead form is intentionally lightweight; OTP-prefill and account-linked enquiries can be added next.
- Property list filters are still UI-only chips; SF-APP-3 should map filters to backend query params.
- Mobile app still needs deeper RWA/NRI/referral surfaces beyond navigation-level exposure.
- Push notifications and app-store build profiles are still future work.

## Recommended next phases

1. SF-APP-3 — Mobile filters, sort, and saved-search alerts.
2. SF-APP-4 — Account-linked enquiries, OTP prefill, and enquiry history.
3. SF-APP-5 — NRI/RWA/referral mobile journeys.
4. SF-APP-6 — EAS build profiles, icon/splash finalization, and test release.
