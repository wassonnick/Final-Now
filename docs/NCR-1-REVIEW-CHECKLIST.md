# NCR-1 Review Checklist

Use this before deciding whether NCR-1 can move beyond review.

## Branch and release safety

- [ ] Confirm branch is `feature/ncr-multicity-foundation`
- [ ] Confirm `main` has not been modified
- [ ] Confirm no production deploy has been triggered
- [ ] Confirm no production database migration has been run
- [ ] Confirm feature flags remain false in production
- [ ] Confirm final tag is review-only: `ncr-1-multicity-foundation-review-v1`

## Backend checks

- [ ] `php artisan route:list --path=api/admin/locations`
- [ ] `php artisan test`
- [ ] Confirm admin location endpoints require admin token
- [ ] Confirm seeded cities exist: Gurugram, Delhi, Noida, Greater Noida, Faridabad
- [ ] Confirm society/property/lead filters remain additive
- [ ] Confirm draft/unpublished records are still excluded from public APIs
- [ ] Confirm Verified Society Importer still defaults to Gurugram without a target city
- [ ] Confirm importer target city context creates drafts only

## Frontend checks

- [ ] `npm run build`
- [ ] `npm run seo:validate`
- [ ] Confirm `/ncr-preview` is noindex
- [ ] Confirm `/ncr-preview` is unavailable when `VITE_NCR_MULTICITY_ENABLED=false`
- [ ] Confirm admin society structured location fields only appear behind the feature flag
- [ ] Confirm public sitemap does not include NCR preview routes

## SEO checks before public NCR rollout

- [ ] Decide canonical plan for Gurgaon/Gurugram spelling
- [ ] Decide whether Delhi/Noida/Faridabad pages are society-led, locality-led, or service-led first
- [ ] Review noindex rules for empty city/locality pages
- [ ] Confirm sitemap minimum thresholds per city
- [ ] Confirm Search Console tracking for new city groups
- [ ] Confirm no templated thin pages are introduced

## Next recommended phases

- NCR-2: Admin location dropdown UX and importer city picker
- NCR-3: City-aware public search and navigation copy
- NCR-4: Noindex/canonical hardening for empty NCR pages
- NCR-5: First indexable non-Gurgaon city pilot after real inventory/content review
