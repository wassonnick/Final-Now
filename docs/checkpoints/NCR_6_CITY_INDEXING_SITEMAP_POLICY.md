# NCR-6 — City Indexing + Sitemap Policy

Date: 2026-07-24  
Branch: `feature/ncr-multicity-foundation`  
HEAD before work: `ab244881e69ce501cb5bafe9e355a0af4757a661`

## Scope

NCR-6 adds the indexing and sitemap policy layer for staged Delhi NCR city pages. The goal is to keep NCR expansion safely review-only by default while creating a clear two-step mechanism for intentionally approving city pages later.

## What changed

- Added backend feature flags:
  - `NCR_CITY_INDEXING_ENABLED`
  - `NCR_INDEXABLE_CITY_SLUGS`
- Added matching frontend/static sitemap support through:
  - `NCR_CITY_INDEXING_ENABLED`
  - `VITE_NCR_CITY_INDEXING_ENABLED`
  - `NCR_INDEXABLE_CITY_SLUGS`
  - `VITE_NCR_INDEXABLE_CITY_SLUGS`
- Extended the SEO page registry to create review-mode NCR city records for staged city slugs:
  - `gurgaon`
  - `delhi`
  - `noida`
  - `greater-noida`
  - `faridabad`
- Added a live sitemap defense so `/ncr/*` routes cannot enter the live sitemap unless:
  1. NCR city indexing is enabled, and
  2. the city slug is explicitly present in the approved slug list.
- Updated static sitemap generation to follow the same allowlist rule.
- Updated SEO validation so `/ncr/*` sitemap URLs remain blocked by default and are allowed only when NCR city indexing is explicitly enabled.
- Added focused backend tests for the default noindex/no-sitemap state and the explicit approved-city sitemap path.

## Safety policy

Default state remains locked:

- NCR preview/admin foundation can exist behind `NCR_MULTICITY_ENABLED`.
- NCR city indexing remains off unless `NCR_CITY_INDEXING_ENABLED=true`.
- No NCR city URL is eligible for sitemap inclusion unless its slug is explicitly listed in `NCR_INDEXABLE_CITY_SLUGS`.
- No fake city inventory or fake locality/property pages were added.
- Existing Gurgaon society/publication filters remain untouched.

## Validation

- `cd backend && php artisan test --filter=NcrMulticityFoundationTest`
  - Passed: 7 tests, 49 assertions.
- `cd frontend && npm run seo:validate`
  - Passed.
- `cd frontend && npm run build`
  - Passed.
  - Note: live API fetches were unreachable during prerender, so the existing sitemap was preserved and static shells were generated. This is the intended safe fallback behavior.
- `git diff --check`
  - Passed.

## Known remaining risks

- Future production indexing requires setting both backend and frontend indexing flags deliberately.
- `NCR_INDEXABLE_CITY_SLUGS` must be reviewed carefully before deploy; one mistyped slug can keep a page out of the sitemap.
- NCR city pages are still content shells and should not be opened for public indexing until city-specific content, data quality, canonical behavior and Search Console QA pass.
- Google Search Console may continue showing older discovered/noindex states for a while after code changes.

## Next recommended phases

- NCR-7 importer source-quality hardening for non-Gurgaon city intake.
- NCR-8 city-specific content/admin QA/backfill.
- NCR-9 approved-city public content rollout after data/content QA.
