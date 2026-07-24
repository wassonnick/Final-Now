# NCR-12 — Frontend City Indexing Policy

Date: 2026-07-24

Branch: `feature/ncr-multicity-foundation`

HEAD before work: `099e1adc2941b0df7b0733aa9bf783afc2f1f24f`

## What changed

- Added a public, safe NCR city launch-policy endpoint:
  - `GET /api/ncr/cities/{slug}/launch-policy`
- The endpoint returns only public-safe policy fields:
  - city name/slug/state/type
  - `is_indexable`
  - `is_sitemap_approved`
  - `is_review_only`
  - canonical path
  - indexing policy label
  - approved public society count
- The endpoint rejects unknown cities and never returns admin approval notes, approval actor, readiness snapshots, or other internal review details.
- Updated `/ncr/:citySlug` frontend page to fetch this policy and fail closed:
  - API unavailable → noindex
  - city unknown → noindex
  - city not explicitly approved → noindex
  - approved by backend launch policy → runtime indexable metadata
- Added backend tests for:
  - fail-closed default policy
  - explicit approval behavior
  - no private approval details in public response
  - unknown city 404

## What stayed protected

- No city was approved.
- No environment flags were changed.
- No NCR page was added to sitemap unless the existing backend policy allows it.
- `/ncr-preview` remains review-only/noindex.
- Existing Gurgaon routes remain the production canonical market.
- The static prerendered HTML remains conservative; runtime metadata only becomes indexable when the backend confirms approval.

## Validation

- `cd backend && php artisan test --filter=NcrMulticityFoundationTest`
  - Passed: 17 tests, 154 assertions
- `cd backend && php artisan test`
  - Passed: 300 tests, 1,945 assertions
- `cd frontend && npm run build`
  - Passed
  - Live API was unreachable during sitemap/prerender retries; existing fail-safe preserved the sitemap and skipped API-fed shells.
- `cd frontend && npm run seo:validate`
  - Passed
- `git diff --check`
  - Passed

## Known remaining risks

- Static NCR HTML is still noindex until the client fetches policy and updates metadata. This is intentionally conservative, but a later production launch may need server/static generation for approved NCR city pages.
- Live API reachability during local build remains intermittent; sitemap/prerender fallback is working, but the deployment environment should be watched.
- City launch is still not production-ready until content depth, locality mapping, and approval review are complete.

## Recommended next phases

- NCR-13: add admin city launch checklist export and compare against Search Console sitemap/indexing state.
- NCR-14: add approved-city static prerender support while keeping unapproved cities noindex.
- NCR-15: expand locality/zone content depth only after real reviewed NCR data exists.
