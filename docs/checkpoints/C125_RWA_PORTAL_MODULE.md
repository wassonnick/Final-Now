# C125 — RWA Portal Module

Date: 2026-07-07  
Branch: `main`  
HEAD before work: `86fe1b54f13286a8303d4a5839295b2cddf2bd37` — `Strengthen SEO Autopilot automation and marketing plan`

## What changed

- Added a dedicated RWA module alongside the existing builder portal.
- Added separate RWA claims using `builder_claims.claim_type = rwa`, so builder claims and RWA claims do not collide.
- Added public RWA pages per society:
  - `/rwa/{society-slug}`
  - Shows RWA claim status, official announcements, resident questions, discussions and grievances.
  - Unapproved resident submissions stay pending.
  - Approved RWA accounts can publish official threads/replies immediately, while announcements still go through admin review.
- Added RWA account role:
  - Login supports `role=rwa`.
  - Protected dashboard route: `/rwa/dashboard`.
  - Dashboard supports society claim submission, official announcement submission, official replies and grievance resolution.
- Added admin moderation:
  - Route: `/admin/rwa`
  - Admin can approve/reject RWA claims.
  - Admin can approve/reject/resolve resident threads.
  - Admin can approve/reject replies.
- Added RWA discovery/SEO entry points:
  - Society detail pages link to each society’s RWA page.
  - Sitemap generation now adds `/rwa/{society-slug}` for every public society.

## Backend additions

- Migration:
  - `2026_07_07_000002_create_rwa_portal_tables.php`
- Models:
  - `RwaThread`
  - `RwaReply`
- Controllers:
  - `Api\RwaPortalController`
  - `Api\Admin\AdminRwaPortalController`
- Routes:
  - Public RWA page API
  - Public/moderated thread submission
  - RWA dashboard APIs
  - RWA admin moderation APIs

## Frontend additions

- Public page:
  - `frontend/src/pages/RwaSocietyPage.tsx`
- RWA account dashboard:
  - `frontend/src/pages/RwaDashboardPage.tsx`
- Admin moderation page:
  - `frontend/src/pages/admin/AdminRwaPortalPage.tsx`
- Shared API client:
  - `frontend/src/lib/rwaApi.ts`
- Login role support:
  - `customer`, `broker`, `rwa`

## How to use

1. RWA representative opens:
   - `/login?role=rwa&next=/rwa/dashboard`
2. They submit an RWA/AOA claim for a published society.
3. Admin reviews at:
   - `/admin/rwa`
4. After approval:
   - RWA dashboard can submit official announcements for moderation.
   - RWA can answer resident questions and mark grievances resolved.
5. Public users see the society RWA page at:
   - `/rwa/{society-slug}`
6. Society pages now link to the RWA page from the right-side action rail.

## SEO behavior

- `/rwa/{society-slug}` is indexable and has route-specific metadata.
- `/rwa/dashboard` remains protected and noindexed through the protected account route flow.
- Sitemap generation now includes public RWA pages for current public societies.
- No fake property or fake resident content is generated.

## Validation

Passed:

- `php artisan test --filter=RwaPortalTest`
  - 2 tests, 23 assertions
- `npm run build`
- `npm run seo:validate`
- `php artisan route:list --path=api`
  - 180 API routes
- `php artisan test`
  - 141 tests, 992 assertions

Build note:

- During local build, sitemap generation could not reach the live API from the environment and preserved the existing healthy sitemap instead of shrinking it.

## Current known risks / next hardening

- RWA claim verification is admin-reviewed but proof upload is still notes-based. Next step should add optional document/image upload for claim evidence.
- Resident submissions are text-only and moderation-based. Future versions can add categories, attachment moderation and resident-only private threads.
- RWA membership is represented by account role + approved claim; there is not yet a separate member roster/invite system.
- Announcements reuse the existing `society_announcements` moderation table, which is efficient but means builder and RWA official notices share the same moderation queue/table.

## Recommended next phases

- C125B — RWA proof uploads, verified member roster and private resident-only threads.
- C125C — RWA SEO enhancement: FAQ schema, issue/category landing snippets and internal links from SEO Autopilot.
- C125D — RWA moderation automation: spam scoring, abuse flags and daily admin digest.
- C116E — importer review hardening.
- C116D — real property inventory pipeline.
