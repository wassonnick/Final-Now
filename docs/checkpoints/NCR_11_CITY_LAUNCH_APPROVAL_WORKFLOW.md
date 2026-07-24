# NCR-11 — City Launch Approval Workflow

## Current HEAD before work

`fa9f9be3b3b9fe711c2fd8be535b3d36710c0beb`

## What changed

- Added a persistent `ncr_city_launch_approvals` table for review-only city launch approvals.
- Added `NcrCityLaunchApproval` model and `NcrCityLaunchPolicy` service.
- Routed NCR city SEO registry and live sitemap inclusion through the launch policy.
- Added admin endpoints:
  - `POST /api/admin/locations/cities/{city}/launch-approval`
  - `POST /api/admin/locations/cities/{city}/launch-revoke`
- Added explicit confirmation strings for approval/revoke actions.
- Added admin UI controls on NCR Locations city readiness QA:
  - shows indexing flag status,
  - shows launch approval status,
  - enables approval only when content is ready and the backend indexing kill switch is enabled,
  - supports revoke.
- Added focused tests for disabled-flag blocking, not-ready blocking, approval, registry/sitemap inclusion, and revoke.

## Safety posture

- NCR city routes remain review-gated.
- No city is approved automatically.
- Approval fails if `NCR_CITY_INDEXING_ENABLED` is not enabled.
- Approval fails if the city is not content-ready:
  - at least five published verified/premium societies,
  - at least three localities,
  - zero unmapped public society/property rows for that city text.
- Existing env approval slugs remain supported, but the new DB approval layer gives admin a safer audit trail.
- No fake data was added.
- No production deploy/publish was performed.

## Known remaining risks

- Public frontend NCR pages currently use review/noindex presentation. A later launch phase should wire frontend noindex/rendering to the same backend launch policy before enabling real public indexing.
- Admin approval is intentionally blocked while the global backend indexing flag is off, so production cannot be opened from UI alone.
- Existing Search Console discovered/alternate/noindex states are historical and require separate SEO cleanup/validation cycles.

## Validation target

- `php artisan test --filter=NcrMulticityFoundationTest`
- `php artisan test`
- `npm run seo:validate`
- `npm run build`

## Next recommended phases

- NCR-12 — frontend NCR public launch policy handshake and noindex removal only for approved cities.
- NCR-13 — city/locality content depth expansion with real society coverage.
- NCR-14 — sitemap/Search Console monitoring for approved NCR city routes.
