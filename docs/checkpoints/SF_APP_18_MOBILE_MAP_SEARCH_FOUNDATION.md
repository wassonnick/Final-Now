# SF-APP-18 — Mobile Map Search Foundation

Date: 2026-07-22

Starting HEAD before this phase:
- `92433cf7` — `Verified builder/RWA applications: real checks behind the approval`

## What changed

- Added a new mobile `/map` screen.
- Built an Expo-Go-safe map-search foundation without adding native map dependencies.
- The screen groups live public societies and verified properties into area clusters.
- Added map-style pins, area summary, area cards, and quick routing into mobile Search.
- Added Map entry points from:
  - Home “Useful at this stage”
  - Explore toolbar
- Added a safe `map_area_opened` analytics event.

## Preserved

- Existing Compare, Saved, Search, Explore, Account, NRI, RWA, Referral, listing and notification mobile flows remain intact.
- No native map SDK or API key was introduced in this phase.
- No backend, web frontend or SEO files were changed.

## Validation target

- `cd mobile && npm run typecheck`
- `cd mobile && npm run lint`

## Known remaining risks

- This is a cluster/list foundation, not a native interactive map yet.
- Property-to-area clustering falls back to society name/slug when the property payload does not include sector/locality directly.
- A later phase should add a native map provider or web map layer after app build/development-client decisions are settled.

## Recommended next phases

- SF-APP-19 — backend-synced saved items and compare lists.
- SF-APP-20 — mobile lead/callback flow polish.
- SF-APP-21 — native map provider/development build, if needed.
