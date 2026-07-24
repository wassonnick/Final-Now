# NCR-5 — Gated City Landing Shells

Date: 2026-07-24

Branch: `feature/ncr-multicity-foundation`

HEAD before work: `61cc7f533bcf9231ce48c1ddefa8a6415cf338cf`

## Scope

NCR-5 adds review-only public city landing shells for future Delhi NCR expansion while keeping production indexing, sitemap inclusion, and existing Gurgaon behavior safe.

## What changed

- Added a feature-flagged `/ncr/:citySlug` city shell route.
- Added review-only city shells for Gurgaon, Delhi, Noida, Greater Noida and Faridabad.
- Updated `/ncr-preview` so city cards link into the gated city shells.
- Added route-level `noindex` metadata to every NCR city shell, including unknown city fallback.
- Added an SEO validator guard that fails if `/ncr/` URLs are accidentally included in `sitemap.xml`.

## Safety posture

- NCR public city shells are behind `VITE_NCR_MULTICITY_ENABLED`.
- Backend NCR behavior remains behind `NCR_MULTICITY_ENABLED`.
- No NCR city shell is added to sitemap generation.
- No fake societies, localities or properties were imported.
- No live publication filters were weakened.
- Existing Gurgaon, society, property, importer, sitemap and SEO flows remain untouched beyond the validator safety guard.

## Validation

- `cd backend && php artisan test --filter=NcrMulticityFoundationTest` — passed, 5 tests / 35 assertions.
- `cd frontend && npm run build` — passed.
- `cd frontend && npm run seo:validate` — passed.
- `git diff --check` — passed.

Build notes:

- Frontend build preserved the existing sitemap when the live API was unreachable during local generation.
- Prerender skipped live society/property/compare shells when the live API was unreachable.

## Known remaining risks

- `/ncr/:citySlug` is a shell only; it should not be treated as production SEO content.
- City pages need approved copy, data depth, internal linking rules and sitemap policy before indexing.
- Non-Gurgaon importer mapping still needs stronger source-quality review before public rollout.
- Google Search Console may continue showing old discovered/noindex URLs until recrawled.

## Recommended next phases

- NCR-6 — sitemap/indexing rollout policy for approved city pages.
- NCR-7 — importer source-quality hardening for non-Gurgaon markets.
- NCR-8 — city-specific content, admin QA and approved data backfill.
