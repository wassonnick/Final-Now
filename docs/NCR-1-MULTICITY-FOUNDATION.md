# NCR-1 Multi-City Foundation

Status: review foundation only. Not production-ready, not deployed, and not merged to `main`.

## Safety status

- Working branch: `feature/ncr-multicity-foundation`
- Base before NCR-1 work: `7cabac6a Merge admin-dashboard-redesign: calm control-room dashboard`
- Local backup before edits: `/private/tmp/sf-ncr-1-backup-20260724115827`
- Production database: not touched
- Production environment variables: not touched
- Production deploy: not triggered
- Main branch: not modified by this work
- Public indexing: no new NCR city routes were added to the sitemap or indexable route set

## Audit findings before structural changes

- The active public/admin society/property/lead APIs live in `backend/routes/api.php` and use `SocietyController`, `PropertyController`, and `LeadController`.
- `Society`, `Property`, and `Lead` were still primarily Gurgaon/string-location based before NCR-1.
- Existing `Locality` and `Builder` models use UUID-style identifiers, but no reliable current migration creating them was found during the takeover audit. NCR-1 therefore creates `localities` only if missing and otherwise adds columns defensively.
- Existing sitemap generation is already hardened and Gurgaon-first. NCR-1 intentionally does not add Delhi/Noida/Faridabad routes to the production sitemap.
- Existing importer flows default to Gurugram. NCR-1 preserves that default and adds optional target city context for future NCR imports.

## What changed

### Backend data model

Added a nullable structured geography layer:

- `regions`
- `cities`
- `zones`
- `localities`

Added nullable NCR fields to:

- `societies`: `region_id`, `city_id`, `zone_id`, `locality_id`, `micro_market`, `authority`, `pincode`
- `properties`: `region_id`, `city_id`, `zone_id`, `locality_id`, `property_category`, `transaction_type`
- `leads`: `region_id`, `city_id`, `zone_id`, `locality_id`, `target_city`, `target_locality`, `target_zone`, `property_intent`, `ncr_context`
- verified importer job tables, when present: target region/city/zone/locality context

The migration seeds:

- Delhi NCR
- Gurugram
- Delhi
- Noida
- Greater Noida
- Faridabad

### Backend APIs

Added admin-only location catalog endpoints:

- `GET /api/admin/locations`
- `GET /api/admin/locations/cities`
- `GET /api/admin/locations/zones`
- `POST /api/admin/locations/zones`
- `PATCH /api/admin/locations/zones/{zone}`
- `GET /api/admin/locations/localities`
- `POST /api/admin/locations/localities`
- `PATCH /api/admin/locations/localities/{locality}`

Added additive location filters to society/property/lead endpoints without weakening publication filters.

### Importer

Verified Society Importer now accepts optional target location context:

- `target_region_id`
- `target_city_id`
- `target_zone_id`
- `target_locality_id`
- `target_city`

If no target city is supplied, the current Gurugram default remains unchanged.

### Frontend

Added a frontend feature helper:

- `isNcrMulticityEnabled()`

Added `/ncr-preview`, guarded by `VITE_NCR_MULTICITY_ENABLED` and explicitly noindexed. When the flag is off, the route returns the normal not-found page.

Added feature-flagged structured location fields to the admin society form. Property payloads can carry structured location values, but NCR-1 does not redesign the property form.

## Feature flags

Backend:

```env
NCR_MULTICITY_ENABLED=false
```

Frontend:

```env
VITE_NCR_MULTICITY_ENABLED=false
```

Keep both false until NCR city pages, canonical strategy, importer QA, and Search Console strategy are reviewed.

## Known limitations

- NCR-1 is a foundation branch, not the full public Delhi/Noida/Faridabad rollout.
- No public NCR city landing pages are indexable yet.
- No production sitemap entries were added for new NCR routes.
- Admin forms use basic structured IDs behind the feature flag; a polished dropdown/search UX should come next.
- Existing Gurgaon SEO assumptions still need a separate content/canonical review before city expansion.
- Existing data is only partially backfilled from string city values; locality/zone mapping remains future work.

## Rollback

Because this work is isolated on `feature/ncr-multicity-foundation`, the safest rollback is:

```bash
git checkout main
```

If a local review database has run the migration and must be rolled back:

```bash
cd backend
php artisan migrate:rollback --step=1
```

Do not run rollback commands against production without a fresh database backup and explicit release approval.
