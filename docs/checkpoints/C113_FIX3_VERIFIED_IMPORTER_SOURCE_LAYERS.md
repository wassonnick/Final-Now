# C113-FIX3 — Verified Importer Source Layers

Date: 2026-07-01

Starting HEAD: `fe2ecb5d` (`c113-fix2a-existing-draft-google-backfill`)

## Outcome

Verified Importer drafts now have separate, review-gated source layers for RERA/legal records, builder/brochure facts, nearby places and market estimates. The working Google/location backfill remains a separate layer and is unchanged.

## Existing-draft imports

- **RERA / Legal:** RERA number/status/source URL apply to existing society columns. Legal name, promoter, registration dates/validity and certificate/OC-CC-PCC references remain field-level provenance where no society column exists.
- **Builder / Brochure:** builder, official URLs, project/possession facts, configuration, area, tower/unit counts, normalized amenities and optional source text apply to the draft. `builder_url` also fills Developer URL, while `rera_url` fills both the official RERA source and RERA Search URL. Cover/gallery URLs create deduplicated pending image candidates and never overwrite an approved image.
- **Nearby Places:** manual and Excel schools, hospitals, metro and office hubs apply to existing nearby fields. Malls, markets and commute notes remain provenance-only because the society table has no matching columns.
- **Market:** rent/resale ranges, averages, price per square foot, yield and maintenance apply as estimates. Confidence is constrained to 55–75 and portal references are never auto-verified.

Automatic Google Nearby fetching was deliberately not added in this phase. Manual/Excel nearby import is complete without adding recurring API cost or pretending unreviewed distance estimates are authoritative.

## Review Queue

Each society now exposes seven layer cards:

- Google Location
- RERA / Legal
- Builder / Brochure
- Nearby Places
- Market
- Content / SEO
- Images

Cards show completed fields, pending review count and source confidence. RERA, builder, nearby and market cards open dedicated inline editors. Content actions refresh description, SEO and deterministic scores only from fields already present.

## Readiness

Admin profile readiness now measures 15 independent data groups: identity/city, location/address/coordinates/Maps, builder, RERA, amenities, nearby intelligence, pending or approved images, description, SEO, score and market data. Readiness remains informational and cannot publish a society.

## Safety

- Every action enforces `Draft`, `Needs Review`, unpublished state.
- Every imported value creates a field source with `needs_review=true`.
- Image candidates remain unapproved.
- Unsupported fields are retained in provenance instead of forced into unrelated columns.
- Repeated image URLs and Google photo references are deduplicated.
- The existing importer and Google importer are untouched.
- The unrelated modified sitemap remains excluded.

## Validation

- Focused Verified Importer suite: **24 tests, 252 assertions — passed**.
- Full backend suite: **78 tests, 639 assertions — passed**.
- Frontend production build — passed.
- SEO validation — passed.
