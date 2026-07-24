# NCR-7 — Importer Source-Quality Hardening

Date: 2026-07-24  
Branch: `feature/ncr-multicity-foundation`  
HEAD before work: `7eedfdbd724e4536ec842ea28e437b70b043888d`

## Scope

NCR-7 hardens Verified Society Importer intake for future non-Gurgaon NCR markets. The goal is to prevent loose text-only Delhi/Noida/Greater Noida/Faridabad rows from becoming draft inventory without structured location context.

## What changed

- Added NCR-aware importer location quality checks inside `VerifiedSocietyImporterService`.
- When `NCR_MULTICITY_ENABLED` is on:
  - Gurgaon/Gurugram remains backwards-compatible.
  - Non-Gurgaon NCR imports require a structured `city_id` / importer target city selection.
  - Selected `zone_id` must belong to the selected city.
  - Selected `locality_id` must belong to the selected city and selected zone when applicable.
  - Structured city/state/region context is preserved on the draft.
  - Non-Gurgaon drafts receive a review warning that they must remain review-only until local source QA is complete.
- Added focused regression tests for:
  - preserving structured Noida target context without publishing,
  - rejecting loose non-Gurgaon text-only imports,
  - rejecting mismatched city/zone/locality combinations.

## Safety policy

- No public NCR pages were made indexable.
- No NCR city URLs were added to the sitemap.
- No fake inventory or fake locality data was added.
- Importer-created societies remain Draft / Needs Review / unpublished.
- Existing Gurgaon importer behavior stays compatible.

## Validation

- `cd backend && php artisan test --filter=NcrMulticityFoundationTest`
  - Passed: 9 tests, 61 assertions.
- `cd backend && php artisan test`
  - Passed: 292 tests, 1852 assertions.
- `cd frontend && npm run seo:validate`
  - Passed.
- `cd frontend && npm run build`
  - Passed.
  - Note: live API fetches were unreachable during sitemap/prerender, so the existing sitemap was preserved and static shells were generated. This is the intended safe fallback behavior.
- `git diff --check`
  - Passed.

## Known remaining risks

- Non-Gurgaon import UX still depends on admin choosing the target city correctly.
- Bulk import rows with mixed target cities should use separate batches until row-level city selectors/mapping are expanded.
- City-specific source QA standards still need admin documentation before NCR public rollout.
- Search Console indexing state may lag older sitemap/noindex states.

## Next recommended phases

- NCR-8 city-specific content/admin QA/backfill.
- NCR-9 approved-city public content rollout after data/content QA.
- NCR-10 row-level NCR importer mapping UX for mixed-city spreadsheet batches.
