# C113-FIX2 — Verified Importer Missing Field Layers

Date: 2026-07-01

Starting HEAD: `8f15f2bd` (`c113-fix3a-google-source-url`)

## Outcome

The separate Verified Society Importer now supports source-tracked RERA, amenity, market, description, SEO and deterministic score layers without changing the existing importer or weakening publication controls.

## Schema audit

The existing `societies` table already supports:

- RERA number, RERA status and official RERA source URL
- amenities JSON using the admin editor's visible checkbox labels
- description, meta title and meta description
- overall, security, maintenance, connectivity, lifestyle and investment scores
- rent/buy ranges, average rent/sale price, price per square foot, rental yield and maintenance charges

There are no dedicated society columns for legal name, promoter name, registration validity, certificate URL, market notes or SEO keywords. Those inputs remain available in `verified_society_field_sources` with their source and confidence instead of being discarded or forced into unrelated columns.

## Import layers

- Single and Excel imports accept the expanded RERA and market field set.
- Bulk pipe/tab/comma rows can include a fourth amenities value.
- Amenities normalize common aliases to the exact labels used by the society edit form.
- Rent/resale minimum and maximum values compose the existing `rent_range` and `buy_range` fields.
- Market field confidence is capped conservatively by source type and always remains reviewable.
- The downloadable CSV template includes the complete supported field set.

## Review-only generators

- **Generate Description** builds only from values already on the draft and never adds missing RERA, price, amenity or nearby claims.
- **Generate SEO** changes its availability language depending on whether imported market data actually exists.
- **Generate Draft Scores** uses deterministic rules, caps scores at 9.2 and leaves unsupported subscores blank.
- **Import/Apply Market Data** is an explicit admin approval action for pending market field sources.

Generated description/SEO fields use `internal_generator`; generated scores use `importer_rule_engine`. Both use confidence 65 and remain `needs_review` until an admin approves them.

## Existing sparse draft backfill

Drafts created before real Google enrichment can now use **Enrich Existing Draft with Google** from the Review Queue. It fills only blank Google-backed profile fields, preserves manual values, records Google field provenance, captures photo references for review, and keeps the society unpublished. Description and SEO controls are explicitly labelled Generate/Refresh so an admin can regenerate them after better source fields arrive.

## Safety

- All importer-created societies remain `Draft`, `Needs Review`, unpublished and without `published_at`.
- Google enrichment remains unchanged.
- The existing importer remains untouched.
- No RERA scraping, portal verification, random scoring or invented claims were added.
- The pre-existing modified sitemap remains outside this phase.

## Validation

- Focused Verified Importer suite: **19 tests, 202 assertions — passed**.
- Full backend suite: **73 tests, 584 assertions — passed**.
- Frontend production build — passed.
- SEO validation — passed.
