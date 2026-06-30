# SocietyFlats — C113 Verified Society Importer V2 Foundation

Date: 2026-06-30
Phase: C113
Branch: `main`
HEAD before work: `e8ac2e5d79ad8c01a452c2055196f2d1bb6558cb`

## Outcome

A separate, admin-only Verified Society Importer V2 now supports single, bulk and Excel/CSV draft imports. It records import jobs, row outcomes, source provenance, field-level confidence and image candidates before any admin approval. Every society created by this module is forced to `Draft`, `Needs Review`, unpublished and score zero.

The existing importer was preserved. Its controller, services, frontend page, behavior and 15 API endpoints were not changed. V2 uses a separate controller, service namespace, tables, API prefix, API client, page and `/admin/verified-society-importer` route.

## Files And Components

Created:

- Five importer models and five dedicated database tables.
- `VerifiedSocietyImporterController` with 14 protected endpoints under `/api/admin/verified-importer`.
- An isolated `Services/VerifiedSocietyImporter` namespace containing orchestration, normalization, duplicate matching, confidence scoring, source recording, image capture and native CSV/XLSX parsing.
- Conservative placeholder services for Google Places enrichment, RERA/HRERA lookup, builder-page inspection and AI extraction.
- `verifiedImporterApi.ts` and `AdminVerifiedSocietyImporterPage.tsx`.
- A seven-test feature suite covering authentication, draft-only creation, provenance, duplicates, row isolation, CSV aliases, image review and publication guards.

Modified only for integration:

- `backend/routes/api.php`: added the separate protected V2 route group.
- `frontend/src/App.tsx`: added the separate protected V2 page route.
- `frontend/src/components/admin/AdminSidebar.tsx`: added the **Verified Importer** link without removing the existing importer.

The pre-existing modification to `frontend/public/sitemap.xml` was preserved byte-for-byte during validation and is intentionally excluded from this phase.

## Database Tables

- `verified_society_import_jobs`
- `verified_society_import_sources`
- `verified_society_field_sources`
- `verified_society_import_rows`
- `verified_society_import_images`

The migration was applied successfully in the local development database.

## Import Flows

### Single

The admin enters identity, location, RERA/Google identifiers, builder/brochure sources and notes. V2 normalizes the input, checks high-confidence duplicates, then either skips, attaches provenance to the existing society, or creates a separate draft when explicitly requested. Declared builder and brochure URLs become their own source records. Google enrichment is visibly marked as a disabled foundation placeholder and performs no external fetch.

### Bulk

Up to 100 rows are accepted as arrays or newline-delimited comma, tab or pipe text. One failed row does not abort the job. Each row stores its own created, duplicate, needs-review or failed outcome, warnings and errors.

### Excel / CSV

The admin uploads a validated `.xlsx` or `.csv` file up to 10 MB. The native parser reads data without executing workbook content, detects supported aliases, previews up to 500 rows, supplies Gurugram as the default city and requires confirmation before draft import. A sample CSV template is downloadable from the protected API.

### Images And Review

Remote image URLs are recorded as pending candidates only after scheme/host safety checks. Localhost, `.local`, private and reserved literal IP hosts are rejected. Up to one cover and ten gallery candidates are captured per row; Google photo references can be stored without downloading binaries. Images never overwrite an approved cover automatically. Explicit admin approval or cover selection still leaves the society unpublished.

The review queue presents pending societies, field sources, image candidates, duplicate holds and low-confidence rows. Field approval can select a source-backed value but cannot publish the society.

## API Endpoints

- Jobs: list, detail and retry failed rows.
- Imports: single, bulk, Excel/CSV preview and confirmed Excel/CSV import.
- Review: queue, field approve/reject, image approve/reject and set cover.
- Template: protected sample CSV download.

All 14 endpoints use the existing `admin.api` middleware. No V2 endpoint is public.

## Current Data State

- Last verified production audit: 40 public societies and zero public properties.
- No production societies, properties, images or import jobs were created by this work.
- Local test records were transactionally isolated and reset by the test suite.

## Validation

- Local migration: passed; all five V2 tables are applied.
- V2 targeted tests: passed; 7 tests and 42 assertions.
- Full backend suite: passed; 61 tests and 424 assertions.
- Frontend production build: passed, including TypeScript and the lazy-loaded V2 admin page.
- SEO validation: passed.
- Sitemap preservation: passed; hash remained `a38e22a0f2420d0d577a81876a5db80b41554dd1` before and after both builds.
- Routes: 15 existing importer endpoints remain; 14 separate V2 endpoints were added.

## Conservative Placeholders

- Direct HRERA/RERA and DTCP lookups.
- Builder website scraping and brochure PDF extraction.
- Gemini/AI extraction.
- Automatic Google Places enrichment and photo binary download.

These placeholders return explicit disabled/placeholder results and do not invent or silently fetch facts.

## Known Risks And Next Work

- Remote image capture records safe-looking source URLs but does not download or inspect remote content type; production binary ingestion needs DNS rebinding protection, response-size limits, MIME verification, hashing and approved storage.
- XLSX parsing intentionally reads only the first worksheet and supports common shared-string/inline-string cells, not formulas or advanced workbook features.
- Import processing is synchronous in the foundation. Queue jobs, progress polling and idempotency controls should precede large production batches.
- Duplicate matching is conservative and may still require admin judgment for renamed projects or builder subsidiaries.
- A later approval workflow must define the final conditions for moving a reviewed society to published; V2 deliberately contains no publish endpoint.
- Production deployment must run the migration before exposing the admin page.

## Commit And Tag

```bash
git add backend/routes/api.php \
  backend/app/Http/Controllers/Api/Admin/VerifiedSocietyImporterController.php \
  backend/app/Models/VerifiedSociety*.php \
  backend/app/Services/VerifiedSocietyImporter \
  backend/database/migrations/2026_06_30_000004_create_verified_society_importer_tables.php \
  backend/tests/Feature/VerifiedSocietyImporterTest.php \
  frontend/src/App.tsx frontend/src/components/admin/AdminSidebar.tsx \
  frontend/src/lib/verifiedImporterApi.ts \
  frontend/src/pages/admin/AdminVerifiedSocietyImporterPage.tsx \
  docs/checkpoints/C113_VERIFIED_SOCIETY_IMPORTER_V2_FOUNDATION.md
git commit -m "Add verified society importer V2 foundation"
git tag c113-verified-society-importer-v2-foundation
```
