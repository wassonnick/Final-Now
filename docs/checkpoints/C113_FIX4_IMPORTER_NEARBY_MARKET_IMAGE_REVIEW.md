# C113-FIX4 — Importer Nearby, Market, Scores and Image Review

Date: 2026-07-01

Starting HEAD: `7ea416c2` (`c113-fix3a-source-url-aliases`)

## Outcome

The Verified Society Importer now completes the remaining review-only draft workflow for Nearby Places, market estimates, deterministic score refreshes and imported image review. Existing Google, builder and RERA enrichment remains intact.

## Nearby Places

- Manual and Excel schools, hospitals, metro/commute and office hubs continue to apply to the real society fields.
- Admin-triggered Google Nearby uses saved coordinates, queries five limited categories and caches results for six hours.
- Results are source-tracked as `google_places_nearby`, confidence 85, and remain review-required.
- Malls/markets remain provenance-backed where the society table has no direct columns.
- The review card reports per-category counts, latest source and fetch time.

## Market estimates and scores

- Added `buy_min` / `buy_max`, `market_source_url`, `market_source_type` and `broker_input` support across manual and Excel flows.
- Rent/buy ranges, averages, price per square foot, yield and maintenance apply to the draft while provenance remains pending review.
- Market confidence remains constrained to 55–75 and is labelled “Market estimate — needs review”.
- The deterministic score engine now includes Place ID, individual Nearby categories, builder/legal/official sources, amenity thresholds and market completeness.
- Score is capped at 9.2; generated score fields remain `importer_rule_engine`, confidence 65, needs review.

## Imported image review

- Admin society responses include up to 20 non-rejected Verified Importer image candidates.
- Both the Society edit Media sidebar and Verified Importer Review Queue show candidate cards.
- Direct image URLs render as previews; Google photo references use the authenticated server-side proxy and never expose the API key.
- Admin can approve a candidate as cover, approve it to gallery, reject it, and open direct source URLs.
- Google gallery approvals are stored in the existing `image_candidates` schema with attribution; direct URLs are deduplicated in approved gallery URLs.
- Rejection removes candidates from all public-use fields. Replacing an approved cover requires explicit confirmation.

## Safety

- Every affected society remains Draft, Needs Review and unpublished.
- No market value or image is auto-approved.
- Google images remain attributed references, not owned uploads.
- Unsafe/private image URLs remain blocked by the existing validator.
- The existing importer, public society filters and SEO behavior are unchanged.
- The unrelated modified sitemap remains excluded.

## Validation

- Focused Verified Importer suite: **30 tests, 311 assertions — passed**.
- Full backend suite: **84 tests, 693 assertions — passed**.
- Frontend production build: passed.
- SEO validation: passed.
- Verified Importer route audit: 23 admin routes, including Google Nearby and authenticated image preview.
