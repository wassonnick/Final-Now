# SocietyFlats Development Handoff

Checkpoint date: 2026-05-30  
Git branch: `phase-2-property-management`  
Checkpoint commit: `9b08f46baf7c6cedf4b62b5741869e917076d1ca`  
Production frontend: `https://final-now-1.onrender.com`  
Production backend API: `https://final-now.onrender.com/api`

This document is the working handoff for restarting development from the current SocietyFlats state. It covers the product, architecture, design system, implementation details, data pipeline, deployment, backup and recovery approach, and the next safest development path.

## 1. Product Goal

SocietyFlats is a Gurgaon-focused society intelligence and property inventory product. The current product supports:

- Public society pages.
- Public property pages and lead capture.
- Admin login protected by an API token.
- Admin dashboard with live backend counts.
- Admin CRUD for societies, properties, and leads.
- Society import for 150 Gurgaon societies from the curated workbook JSON.
- Safe official-source enrichment workflow.
- Placeholder-first image policy to avoid unlicensed image reuse.

The product is currently in the data-foundation and admin-tooling phase. The next major milestone is verified, source-backed society data and a small set of real Gurgaon property inventory.

## 2. Repository Structure

```text
Final Now/
  frontend/                  React + TypeScript + Vite app
  backend/                   Laravel API app
  backend/database/imports/  Curated import JSON
  backend/database/migrations/
  docker/                    Nginx/docker support
  render.yaml                Render blueprint reference
  README.md
  DEPLOYMENT_GUIDE.md
```

`backend_old/` exists as an older backup/reference folder. Current active development is in `backend/` and `frontend/`.

## 3. Technology Stack

Frontend:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/Radix-style UI primitives
- Lucide icons

Backend:

- Laravel 13
- PHP 8.3
- PostgreSQL on Render
- Eloquent models and API controllers
- Artisan commands for data import and enrichment

Deployment:

- Render static frontend service.
- Render Docker backend service.
- Render PostgreSQL database.

## 4. Core URLs and Environment

Frontend service:

```text
https://final-now-1.onrender.com
```

Backend API:

```text
https://final-now.onrender.com/api
```

Health check:

```text
https://final-now.onrender.com/api/health
```

Expected health response:

```json
{"status":"ok","service":"societyflats-api"}
```

Important frontend environment variable:

```text
VITE_API_BASE_URL=https://final-now.onrender.com/api
```

Important backend environment variables:

```text
APP_ENV=production
APP_DEBUG=false
APP_KEY=...
DB_CONNECTION=pgsql
DB_HOST=...
DB_PORT=5432
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
ADMIN_API_TOKEN=...
FRONTEND_URL=https://final-now-1.onrender.com
```

## 5. Current API Surface

Public:

```text
GET  /api/health
GET  /api/societies
GET  /api/societies/{slug}
GET  /api/properties
GET  /api/properties/{idOrSlug}
POST /api/leads
```

Admin routes require `admin.api` middleware and the configured admin token:

```text
GET    /api/admin/stats
POST   /api/admin/uploads/images
POST   /api/admin/societies/{society}/enrich
GET    /api/admin/societies
POST   /api/admin/societies
GET    /api/admin/societies/{society}
PUT    /api/admin/societies/{society}
DELETE /api/admin/societies/{society}
GET    /api/admin/properties
POST   /api/admin/properties
GET    /api/admin/properties/{property}
PUT    /api/admin/properties/{property}
DELETE /api/admin/properties/{property}
GET    /api/admin/leads
PUT    /api/admin/leads/{lead}
DELETE /api/admin/leads/{lead}
```

## 6. Data Model Summary

Main active tables:

- `societies`
- `properties`
- `leads`
- Laravel user/cache/job tables

Society model now supports:

- Basic profile fields: name, slug, builder, sector, locality, address, description.
- Market/stat fields: towers, units, maintenance, rent/buy ranges, rental yield, average rent, average sale, price per sq ft.
- Scores: overall, security, maintenance, connectivity, lifestyle, investment.
- Nearby fields: schools, metro, hospitals, office hubs.
- SEO fields: meta title, meta description, FAQ.
- Publishing flags: status, featured, hero, search boost.
- Map/RWA fields.
- Import metadata: RERA number, source name, source URL, data quality, imported timestamp.
- Official source fields:
  - `official_project_url`
  - `official_developer_url`
  - `official_brochure_url`
  - `official_floor_plan_url`
  - `official_gallery_url`
  - `official_source_status`
  - `official_source_last_checked_at`
  - `official_source_notes`
  - `rera_search_url`
  - `google_maps_url`
  - `source_confidence_score`
- Safe image workflow fields:
  - `image_reference_url`
  - `image_url`
  - `image_status`
  - `image_alt_text`
  - `image_credit`
  - `image_license_notes`

## 7. Image Safety Policy

Images are intentionally conservative.

Do not automatically download, copy, or permanently store images from developer, broker, Google, RERA, or portal pages.

Allowed public image statuses:

- `licensed_uploaded`
- `self_shot_uploaded`
- `developer_permission_received`

Reference-only statuses:

- `placeholder`
- `official_reference_found`
- `needs_review`

Public frontend should continue to show placeholders unless the image status is approved. `official_gallery_url` and `image_reference_url` are for admin reference only.

## 8. Data Import Pipeline

Curated import file:

```text
backend/database/imports/gurgaon_societies_150.json
```

Import command:

```bash
cd backend
php artisan societies:import-gurgaon-master --reset-unverified
```

The import:

- Imports or updates 150 societies.
- Keeps every society as `Draft`.
- Clears unverified stats, coordinates, amenities, nearby fields, and unsafe media when `--reset-unverified` is used.
- Does not mark societies verified.
- Stores RERA search URLs and Google Maps URLs where available.
- Seeds known official developer homepage URLs where reasonably identifiable.
- Leaves `official_project_url` blank unless known.

Current import status at checkpoint:

- 150 total society records in curated JSON.
- 0 official project URLs in the curated JSON.
- 127 official developer homepage URLs in the curated JSON.
- 150 placeholder image statuses.
- No approved image URLs in the curated JSON.

## 9. Official Source Discovery and Enrichment

Command:

```bash
cd backend
php artisan societies:enrich-official-sources --discover --delay=2
```

Useful test run:

```bash
php artisan societies:enrich-official-sources --discover --limit=10 --delay=2
```

Normal enrichment for records that already have an official project page:

```bash
php artisan societies:enrich-official-sources --delay=2
```

Cleanup accidental asset URLs:

```bash
php artisan societies:enrich-official-sources --clean-assets
```

Behavior:

- Respects robots.txt.
- Does not bypass CAPTCHA.
- Uses delay between requests.
- Does not scrape private or owner data.
- Does not copy long descriptions.
- Extracts only factual clues: RERA, towers, units, year, amenities, brochure/floor/gallery links.
- Updates blank fields unless `--overwrite` is supplied.
- Does not download images.
- Rejects image/PDF/video/document asset URLs as `official_project_url`.
- Marks uncertain rows as `needs_manual_review`.

Recent Render test result:

- `--discover --limit=10 --delay=2` processed 10.
- Enriched 5.
- Found pages for Adani Oyster Grande, Bestech, BPTP examples.
- One asset URL was discovered for ATS Kocoon before the stricter fix. Use `--clean-assets` after deploy to clear it.

## 10. Admin Frontend Workflow

Admin app pages:

- `/admin/login`
- `/admin/dashboard`
- `/admin/societies`
- `/admin/societies/new`
- `/admin/societies/{slug}/edit`
- `/admin/properties`
- `/admin/properties/new`
- `/admin/leads`

Society admin features:

- Full society list fetches all paginated records.
- Filters by Draft, Verified, Premium, Archived.
- Bulk selection and bulk status update.
- Edit form contains:
  - Basic info.
  - Stats.
  - Scores.
  - Amenities.
  - Nearby intelligence.
  - SEO/FAQ.
  - Publishing flags.
  - Official source fields.
  - Safe image approval fields.
  - Location fields.
- Enrich button is inside edit form.
- Enrich button disables after enrichment.
- Changing source/project URL re-enables enrichment.

## 11. Public Frontend Behavior

Public society pages:

- Display placeholder image unless image is approved.
- Show official links only when fields exist:
  - Official Project Page
  - Developer Website
  - Brochure
  - Floor Plan
  - Gallery Reference
  - Google Maps
  - RERA Search
- Show trust note:
  - Project information is sourced from official/developer/RERA references where available and manually verified before being marked verified.

Public listings:

- Public society list only returns `Verified` and `Premium` societies.
- Public property list only shows `Live` listings.
- Draft/admin-only data remains in admin.

## 12. Design System and UX Direction

Admin design:

- Clean white/light-gray operational interface.
- Left sidebar navigation.
- Large readable forms and sections.
- Rounded cards are used for form groupings.
- Icons from Lucide.
- Focus on data entry, verification, and workflow clarity.

Public design:

- Premium real-estate look.
- White, navy, ivory palette.
- Large society hero image area, but placeholder until approved media exists.
- Cards for inventory, amenities, nearby intelligence, market snapshot.
- Trust and verification messaging should remain visible and conservative.

Important design rule from current phase:

- Avoid making unverified data look final.
- Prefer blank or `Not added` over invented content.
- Clearly distinguish references from verified facts.

## 13. Deployment Workflow

Normal Git flow:

```bash
git status
git add .
git commit -m "Your commit message"
git push
```

Render redeploys from GitHub after push.

After migrations are added:

```bash
php artisan migrate --force
```

After import changes:

```bash
php artisan societies:import-gurgaon-master --reset-unverified
```

After source discovery changes:

```bash
php artisan societies:enrich-official-sources --clean-assets
php artisan societies:enrich-official-sources --discover --limit=10 --delay=2
php artisan societies:enrich-official-sources --discover --delay=2
```

Health verification:

```bash
curl https://final-now.onrender.com/api/health
```

Expected:

```json
{"status":"ok","service":"societyflats-api"}
```

## 14. Local Development Commands

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run build
```

Backend:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Validation used at this checkpoint:

```bash
php -l backend/app/Console/Commands/EnrichOfficialSocietySources.php
php -l backend/app/Console/Commands/ImportGurgaonMasterSocieties.php
php -l backend/app/Http/Controllers/Api/SocietyController.php
npm run build
```

## 15. Known Issues and Risks

Current known issues:

- `official_project_url` discovery is heuristic. It should never be treated as verification.
- Many developer sites have dynamic navigation or block automated requests.
- Some project discovery results may still need manual review.
- RERA URLs are search URLs, not always direct project certificate pages.
- Some old docs still mention older placeholder service names and `/api/v1` paths; active app uses `/api`.
- `backend_old/` is not active and may confuse future work.
- Public image fallback currently uses Unsplash placeholder; production should eventually use a branded/local placeholder asset.
- There is a duplicate `POST /api/leads` route in `backend/routes/api.php`; harmless but should be cleaned.

Important risk policy:

- Never mark a society verified only because a developer URL exists.
- Verification requires source match, RERA/developer/civic confirmation, and manual admin review.

## 16. Recommended Next Development Order

1. Run `--clean-assets` on Render after this checkpoint.
2. Run discovery in small batches and review results.
3. Add admin table columns/filters for `official_source_status` and confidence score.
4. Add a review queue for societies needing manual source verification.
5. Improve source discovery using a controlled curated mapping file rather than pure crawling.
6. Add branded placeholder image assets.
7. Upload 5 verified real Gurgaon properties.
8. QA public society page, property page, lead form, admin CRUD.
9. Only then move larger inventory live.

## 17. Backup and Recovery

This checkpoint should be backed up in two ways:

1. Git history bundle:
   - Best for restoring exact commits and branches.
2. Source snapshot archive:
   - Best for quickly opening the project folder even if GitHub/remote access is unavailable.

Restore from Git bundle:

```bash
git clone SocietyFlats_git_2026-05-30.bundle "Final Now Restored"
cd "Final Now Restored"
git checkout phase-2-property-management
```

Restore from source snapshot:

```bash
unzip SocietyFlats_source_2026-05-30.zip -d restored-societyflats
cd restored-societyflats/Final\ Now
```

After restore:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate

cd ../frontend
npm install
npm run build
```

## 18. Checkpoint Commit Trail

Recent commits:

```text
9b08f46b Reject asset URLs during official source discovery
f622b9cf Add official source discovery mode
c0bb74b5 Add safe official society source workflow
b4fc78ed Fix society enrich completion state
b9c86a47 Improve society enrichment admin workflow
10e5b99d Clean unverified society draft fields
d22b91fc Improve draft society import quality
3546bce7 Add Gurgaon master society import
9d1a097e Improve society enrichment fallbacks
8e9723a3 Enrich society drafts with maps and nearby data
10935169 Add society draft enrichment action
3982981f Skip commercial projects in society import
```

## 19. Data Trust Rules

Source confidence scoring:

- Official developer project URL found: +15
- Official RERA match: +40
- Official brochure found: +10
- Official Google Maps match: +5
- RWA/association source: +10
- Broker portal only: +0

Disallowed as official sources:

- 99acres
- Magicbricks
- Housing
- NoBroker
- SquareYards
- CommonFloor
- PropTiger
- Makaan
- Random broker websites
- YouTube videos
- Pinterest
- Facebook reposts
- Instagram reposts

Allowed only as discovery/reference, not official source:

- Broker portals
- Google image search
- Social pages
- Reposted media

## 20. Final State Summary

As of this checkpoint:

- Admin CRUD is functional.
- Dashboard uses real backend stats.
- Dummy data has been removed from live counts.
- 150 Gurgaon society drafts can be imported.
- Official-source fields and safe image workflow are implemented.
- Official source discovery exists and should be run carefully in batches.
- Images are not downloaded or copied automatically.
- Placeholder image remains default.
- Project is pushed to GitHub at checkpoint commit `9b08f46baf7c6cedf4b62b5741869e917076d1ca`.
