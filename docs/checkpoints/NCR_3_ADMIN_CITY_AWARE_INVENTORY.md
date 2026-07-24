# NCR-3 — Admin City-Aware Inventory Filters

Date: 2026-07-24

Branch: `feature/ncr-multicity-foundation`

HEAD before work: `f559d48d187aab3af5e837af184495f852403a5d`

Previous checkpoint/tag: `ncr-2-admin-location-manager-review-v1`

## Scope

NCR-3 keeps the NCR expansion behind feature flags and improves admin inventory visibility before any public city expansion is enabled.

Feature flags remain off by default:

- Backend: `NCR_MULTICITY_ENABLED=false`
- Frontend: `VITE_NCR_MULTICITY_ENABLED=false`

## What changed

- Added shared admin NCR location filter component for city, zone and locality filtering.
- Wired NCR city/zone/locality filters into the admin societies list.
- Wired NCR city/zone/locality filters into the admin properties list.
- Added admin API query support for society `status` and property `status` / `property_type` filters.
- Kept existing backend structured NCR filters active for admin society and property queries.
- Added importer job target visibility so import history shows the target city/zone/locality context used for a job.

## Safety boundaries preserved

- Public NCR city pages remain disabled behind the feature flag.
- No NCR pages were added to the public sitemap.
- Existing public society and property publication filters were not weakened.
- Existing Gurgaon text fallback remains compatible while structured NCR IDs are introduced.
- Admin/importer workflows remain review-first.

## Current expected behavior

When the frontend NCR flag is enabled locally or in a review environment:

- `/admin/locations` shows the staged NCR location manager.
- `/admin/societies` can filter by NCR city, zone and locality.
- `/admin/properties` can filter by NCR city, zone and locality.
- Verified Society Importer job history shows the target city/zone/locality context for each import job.

When the frontend NCR flag is disabled:

- Admin inventory behaves as before.
- NCR admin filters are hidden.
- Public site remains Gurgaon-first.

## Validation

Passed locally:

- `cd frontend && npm run build`
- `cd frontend && npm run seo:validate`
- `cd backend && php artisan test --filter=NcrMulticityFoundationTest`
- `cd backend && php artisan route:list --path=api/admin/locations`

Build note:

- The local sandbox could not reach the live Render API during sitemap/prerender generation, so the existing sitemap was preserved and live-data prerender shells were skipped. TypeScript, Vite build and static SEO validation still passed.

## Known remaining risks

- Live admin UI will show `/api/admin/locations` as unavailable until the backend deploy containing NCR routes is live.
- If `VITE_NCR_MULTICITY_ENABLED=true` is enabled before DB backfill/migrations run in production, city filters may hide older unstructured rows.
- Public NCR indexing should not be enabled until city/locality content strategy and sitemap policy are reviewed.

## Next recommended phases

1. NCR-4 — structured city/locality backfill verification and admin QA on deployed backend.
2. NCR-5 — gated public NCR city landing templates, still noindex until approved.
3. NCR-6 — sitemap/indexing rollout plan for verified NCR city pages only.
4. NCR-7 — importer source-quality hardening for non-Gurgaon city intake.

