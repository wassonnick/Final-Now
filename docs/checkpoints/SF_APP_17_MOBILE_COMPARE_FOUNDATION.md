# SF-APP-17 — Mobile Compare Foundation

Date: 2026-07-22

Starting HEAD before this phase:
- `85d25479` — `sf-app-16-hydrated-mobile-shortlist`

## What changed

- Replaced the mobile Compare placeholder with a working society comparison screen.
- Compare now hydrates saved society slugs into real society cards.
- Added live society search for adding more compare items.
- Limited comparison to three societies to keep the first mobile UX clean.
- Added side-by-side decision data:
  - society score
  - builder
  - location
  - linked homes count
  - approved amenities preview
- Added an AI Advisor CTA that sends the selected society names into a decision-help prompt.
- Added a homepage journey link to the Compare screen.

## Preserved

- Existing web frontend, backend, SEO autopilot, social, importer, RWA, Builder Portal and property workflows were not changed by this phase.
- Existing mobile saved shortlist hydration from SF-APP-16 remains intact.
- Existing Expo Go notification guard from SF-APP-14A remains intact.

## Validation target

- `cd mobile && npm run typecheck`
- `cd mobile && npm run lint`

## Known remaining risks

- Compare currently uses the public society detail API and mobile saved store; it does not yet call backend `/compare/intelligence`.
- There is still no dedicated mobile map tab.
- Saved item sync to backend remains partial; local saved state is the main source for the Compare seed.

## Recommended next phases

- SF-APP-18 — mobile map/search-area experience.
- SF-APP-19 — backend-synced saved items and compare lists.
- SF-APP-20 — mobile lead/callback flow polishing.
