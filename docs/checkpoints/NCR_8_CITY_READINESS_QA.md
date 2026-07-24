# NCR-8 — City Readiness QA

Date: 2026-07-24

Branch: `feature/ncr-multicity-foundation`

HEAD before work: `959d8f44ad69c7cc0f311eb3a95d86cd5cac0779`

## Purpose

NCR-8 adds an admin-only readiness layer for Delhi NCR expansion. The goal is to make `/admin/locations` useful for review instead of merely showing staged city/location text.

This phase does not publish new public city SEO pages, does not add NCR city URLs to sitemap, and does not change draft/publication filters.

## What changed

- Extended `GET /api/admin/locations/audit` with `city_readiness`.
- Added conservative readiness metrics for staged NCR cities:
  - public societies
  - draft/review societies
  - public properties
  - zones
  - localities
  - published localities
  - verified importer jobs
  - unmapped public rows by city text
  - indexing approval state
  - recommended status
  - next actions
- Added the NCR-8 readiness board to `/admin/locations`.
- Added backend test coverage for conservative city readiness and private lead-data safety.

## Safety posture

- Admin-only API remains protected by admin token.
- No lead names, phones, emails, messages, or private notes are returned.
- Expansion cities remain effectively review-only unless:
  - city content is deep enough,
  - structured mappings are clean,
  - `NCR_CITY_INDEXING_ENABLED=true`, and
  - the city slug is explicitly present in `NCR_INDEXABLE_CITY_SLUGS`.
- Sitemap policy is unchanged.
- Public noindex policy is unchanged.

## How to review

Open:

`/admin/locations`

Check the `NCR-8 city readiness QA` section. It should show each staged city with launch blockers and next actions.

Expected meaning:

- `Core market live`: Gurgaon has existing public society inventory.
- `Needs verified societies`: expansion city does not yet have enough approved public society profiles.
- `Needs locality depth`: city needs more structured sector/locality coverage.
- `Awaiting indexing approval`: content may be close, but indexing is still blocked by policy.
- `Hold noindex`: keep staged only.

## Validation

Focused validation already run during implementation:

```bash
cd backend
php artisan test --filter=NcrMulticityFoundationTest
```

Result:

- 10 tests passed
- 70 assertions

Full backend/frontend validation should be run before release:

```bash
cd backend && php artisan test
cd ../frontend && npm run seo:validate
cd ../frontend && npm run build
```

## Known remaining risks

- City readiness thresholds are intentionally conservative and may need product tuning.
- Expansion city content remains thin until verified society imports are actually reviewed and published.
- Backfill is still manual; this checkpoint adds QA visibility, not automated mutation.

## Recommended next phases

- NCR-9: Admin-assisted structured city/locality backfill preview with explicit apply controls.
- NCR-10: Public NCR city shell content expansion, still noindex by default.
- NCR-11: City sitemap launch process for approved cities only.
- NCR-12: Importer UX improvements for selecting city/zone/locality during verified imports.
