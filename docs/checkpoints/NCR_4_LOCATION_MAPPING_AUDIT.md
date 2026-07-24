# NCR-4 — Location Mapping Readiness Audit

Date: 2026-07-24  
Branch: `feature/ncr-multicity-foundation`  
HEAD before work: `c30c775beeea862177b8d55cbf3aff814743236a`

## Purpose

NCR-4 adds an admin-only readiness audit before any public multi-city rollout. The goal is to make sure existing Gurgaon societies, properties, leads and importer jobs are safely mapped to structured NCR location IDs before public city filters, public NCR pages or sitemap expansion are enabled.

## What changed

- Added protected API endpoint:
  - `GET /api/admin/locations/audit`
- Added backend audit buckets for:
  - society city-ID mapping
  - property city-ID mapping
  - lead target-city mapping
  - verified society importer target-city mapping
- Added a rollout recommendation:
  - `ready_for_public_city_filters`
  - clear admin-facing message if public rows still need structured city IDs
- Added an NCR-4 readiness panel on `/admin/locations`.
- Kept the audit UI non-blocking so the NCR location catalog still loads if only the audit endpoint is unavailable on a partially deployed backend.
- Added a focused test proving:
  - audit endpoint requires admin token
  - mapping gaps are counted
  - private lead data is not exposed

## Safety posture

- Admin-only.
- No public NCR route changes.
- No sitemap changes.
- No public indexing changes.
- No weakening of publication filters.
- No secret/env output.
- No raw lead name/phone/email exposure in the audit response.

## Validation

- `cd backend && php artisan test --filter=NcrMulticityFoundationTest`
  - Passed: 5 tests, 35 assertions.
- `cd backend && php artisan route:list --path=api/admin/locations`
  - Shows `GET /api/admin/locations/audit`.
- `cd frontend && npm run build`
  - Passed.
  - Live API was unreachable during sitemap/prerender retries, so existing sitemap was preserved and static shells were generated without live society/property pages.
- `cd frontend && npm run seo:validate`
  - Passed.
- `git diff --check`
  - Passed.

## Known remaining risks

- Production will need the backend route deployed before the live admin UI can show real audit counts.
- Existing production data should be checked with `/api/admin/locations/audit` after deploy to confirm public societies/properties have structured city IDs.
- NCR public pages should remain feature-flagged/noindex until mapping audit shows safe readiness and content has been approved.
- The audit reports counts and top city labels only; it does not perform automatic backfill.

## Next recommended phases

1. `NCR-5` — gated public NCR city landing templates with noindex and no sitemap inclusion.
2. `NCR-6` — sitemap/indexing rollout rules after city content is approved.
3. `NCR-7` — importer hardening for non-Gurgaon city/zone/locality assignment.
