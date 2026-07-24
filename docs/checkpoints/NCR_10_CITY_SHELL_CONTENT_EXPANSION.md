# NCR-10 — City Shell Content Expansion

Date: 2026-07-24  
Branch: `feature/ncr-multicity-foundation`  
HEAD before work: `dac1a754065752f6e5f06e5ef52d8d82d29520b1`

## Purpose

NCR-10 makes the review-only `/ncr/:citySlug` pages useful to inspect instead of feeling like plain text placeholders.

The goal is still not public NCR SEO launch. These pages remain staged, gated and safe.

## What changed

- Expanded `/ncr/:citySlug` city pages with:
  - city-specific positioning for Gurgaon, Delhi, Noida, Greater Noida and Faridabad;
  - prepared corridor cards;
  - launch proof points;
  - city readiness path;
  - connected SocietyFlats journey links into compare, maps, NRI support and corrections/data flows.
- Removed the public `/admin/locations` link from the public city shell.
- Expanded `/ncr-preview` with clearer review guidance so the page explains what admins should check.
- Updated SEO registry metadata for NCR city pages:
  - richer title, meta description and H1;
  - higher content/readiness scoring;
  - `content_readiness_version = ncr_10_city_shell_content`.
- Added tests that assert NCR city pages remain:
  - public but noindex by default;
  - excluded from sitemap by default;
  - content-rich enough for future approval review.

## Safety preserved

- No fake properties or societies were added.
- No NCR city page was added to sitemap by default.
- No NCR city page is indexable by default.
- Public indexing still requires:
  - `NCR_CITY_INDEXING_ENABLED`;
  - explicit approved city slug;
  - existing backend sitemap policy.
- Existing Gurgaon canonical flow remains `/gurgaon`; `/ncr/gurgaon` stays a noindex preview shell.

## Review checklist

- Open `/ncr-preview`.
- Open:
  - `/ncr/gurgaon`
  - `/ncr/delhi`
  - `/ncr/noida`
  - `/ncr/greater-noida`
  - `/ncr/faridabad`
- Confirm each page has enough context to review:
  - what the city page is for;
  - what corridors/zones are staged;
  - what must be verified before launch;
  - where users should go next.
- Confirm page source still contains noindex metadata.
- Confirm sitemap does not include `/ncr/*` routes unless city indexing flags are intentionally enabled later.

## Known remaining risks

- These pages are still preview copy, not production city SEO content.
- Delhi/Noida/Greater Noida/Faridabad need real verified society depth before indexing.
- The frontend currently hard-noindexes NCR city pages; a later launch phase should wire frontend noindex to the same explicit city-approval policy used by the backend registry.

## Suggested next phase

NCR-11 — City launch approval workflow:

- Add admin city approval controls.
- Show per-city readiness blockers.
- Keep sitemap/indexing disabled until an admin explicitly approves a city and confirms verified content depth.
