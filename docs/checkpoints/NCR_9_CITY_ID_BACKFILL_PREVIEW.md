# NCR-9 — City ID Backfill Preview + Explicit Apply

Date: 2026-07-24

Branch: `feature/ncr-multicity-foundation`

HEAD before work: `2c15555e5ee6c27b5b164af4259ad7796e31a37b`

## Purpose

NCR-9 adds an admin-assisted structured city ID backfill workflow for the Delhi NCR foundation. It is intentionally conservative: preview first, explicit apply second, exact known city text only.

This phase does not publish draft rows, does not add public city pages to sitemap, does not enable NCR indexing, and does not weaken existing publication filters.

## What changed

### Backend

Added protected admin endpoints:

- `GET /api/admin/locations/backfill/preview`
- `POST /api/admin/locations/backfill/apply`

The apply endpoint requires:

```json
{
  "confirmation": "APPLY_NCR_CITY_BACKFILL"
}
```

The backfill matches only exact known city labels:

- `Gurgaon`
- `Gurugram`
- `Delhi`
- `Noida`
- `Greater Noida`
- `Faridabad`

It can set structured city links for:

- societies: `region_id`, `city_id`
- properties: `region_id`, `city_id`
- leads: `region_id`, `city_id`
- verified society import jobs: `target_region_id`, `target_city_id`

### Frontend

Added an NCR-9 panel to `/admin/locations`:

- Preview backfill
- Summary counts
- Per-city row counts
- Sample row IDs only
- Explicit apply button

The UI copy states that it does not publish, index, or change sitemap policy.

## Safety posture

- Admin-token protected.
- No fuzzy matching.
- No locality guessing.
- No public indexing changes.
- No sitemap changes.
- No draft/publication filter changes.
- Lead preview shows IDs/counts only, not names, phones, email, notes, messages, or requirements.
- Apply requires explicit confirmation string on the backend, not only a frontend button.

## Validation

Focused validation run during implementation:

```bash
cd backend
php artisan test --filter=NcrMulticityFoundationTest
```

Result:

- 11 tests passed
- 99 assertions

Full validation should be run before release:

```bash
cd backend && php artisan test
cd ../frontend && npm run seo:validate
cd ../frontend && npm run build
```

## Known remaining risks

- This only handles obvious city-text backfill. Rows needing zone/locality mapping still require review.
- Misspellings, alternate local city labels, and raw address parsing are intentionally not handled here.
- Apply should be run after reviewing preview counts on production.

## Recommended next phases

- NCR-10: Public NCR city shell content expansion, still noindex by default.
- NCR-11: Explicit city indexing/sitemap launch checklist for one approved city.
- NCR-12: Importer UX improvements for selecting target city, zone, and locality.
