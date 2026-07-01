# C113 Fix 3 — Real Google Places Enrichment

Date: 2026-07-01
Starting HEAD: `2fe50bab7af82e82544b4ff78a61e71f29784164`

## Problem confirmed

The Verified Society Importer accepted the complete profile schema, but **Create + Enrich with Google** still called a disabled placeholder. A name-only import therefore created a safe draft with only supplied/default identity fields and no external facts.

## Change

- Connected the V2 importer to the existing server-side Google Places resolver.
- A reliable match can now fill blank Google-owned fields: place ID, Maps/source URL, coordinates, formatted address, sector/locality/city/state, place website and up to ten photo references.
- Admin-entered values always win; Google enrichment only fills blank fields.
- Google Places and Google Photos values receive their own source records, field provenance and confidence values.
- Photo references enter the existing image review queue and are never approved or published automatically.
- The job summary and UI now report whether enrichment actually succeeded.
- Missing API configuration or no reliable match degrades safely to a manual review-only draft.

## Deliberate limits

Google Places does not authoritatively provide SocietyFlats scores, prices, rental yield, amenities, RERA facts, nearby intelligence or editorial/SEO copy. Those fields remain blank unless supplied from a verified source. The importer does not invent them.

## Publication safety

Every created society remains `Draft`, `Needs Review`, unpublished and publication-gated. Google photo references remain pending until an admin reviews them.

## Validation

- Focused importer suite: **14 tests, 151 assertions — passed**.
- Full backend suite: **68 tests, 533 assertions — passed**.
- Frontend production build — passed.
- SEO validation — passed.
- The pre-existing modified sitemap was preserved and excluded from this release.
