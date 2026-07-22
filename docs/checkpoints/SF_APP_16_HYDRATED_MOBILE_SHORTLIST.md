# SF-APP-16 — Hydrated Mobile Shortlist

Date: 2026-07-22

Starting HEAD before work: `74d41501` (`sf-app-15-notification-preferences-sync`)

## What changed

- Upgraded the mobile Saved tab from raw saved IDs/slugs into a richer shortlist experience.
- Saved societies are now hydrated from the public society API and rendered with full `SocietyCard` UI.
- Saved properties are now hydrated from the public property API and rendered with full `PropertyCard` UI.
- Added explicit remove support to the saved-store API for societies/properties.
- Added “Remove from shortlist” actions for saved societies and saved homes.
- Added safe fallback rows for stale/deleted saved items so the Saved tab remains usable if a saved slug no longer resolves.
- Signed-out users still see their local shortlist, now with hydrated cards when the public API can resolve them.

## Preserved

- Account saved-search alert management from SF-APP-14.
- Notification preference sync and Expo Go notification guard from SF-APP-15/SF-APP-14A.
- Local-first saved item behavior; no backend saved-society/property schema was introduced in this phase.

## Validation

- `cd mobile && npm run typecheck` — passed.
- `cd mobile && npm run lint` — passed.

## Known remaining risks

- Saved societies/properties are still local-first and not account-synced yet.
- Hydration uses one public API request per saved item; a future backend account shortlist endpoint should batch and persist these records.
- Stale saved items remain visible until the user removes them, by design.

## Next recommended phases

- SF-APP-17 — backend account shortlist endpoints for saved societies/properties with batch hydration.
- SF-APP-18 — mobile maps and compare polish.
- SF-APP-19 — mobile NRI/RWA module screens.
