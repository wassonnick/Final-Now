# C124 — SEO Autopilot Automation + Marketing Plan

Date: 2026-07-07  
Branch: `main`  
HEAD before work: `87f4953b063dc2e60cdb7eae0d07b6d04f9e9765`

## What changed

- Added a closed-loop SEO Autopilot runner that can execute the full automation cycle:
  - page registry sync
  - page audits
  - technical checks
  - keyword refresh
  - Search Console import when configured
  - opportunity-based review draft generation
  - daily report generation
  - run logging with warnings/errors
- Added persistent automation settings and run history tables:
  - `seo_automation_settings`
  - `seo_automation_runs`
- Added admin API endpoints:
  - `POST /api/admin/seo-autopilot/automation/run`
  - `PATCH /api/admin/seo-autopilot/automation/settings`
- Replaced scattered daily SEO schedules with one daily complete cycle:
  - `php artisan seo:autopilot-run`
  - scheduled daily at `02:00`
- Upgraded the SEO Autopilot admin overview with:
  - Automation Engine card
  - run-now action
  - next/last run status
  - recent run history
  - module toggles
  - drafts-per-run control
  - embedded SEO marketing plan
- Added feature tests for:
  - dashboard automation payload
  - full automation run logging
  - settings pause behavior
- Restored validator-required public copy:
  - AI Advisor continuation/search affordance in local dirty file
  - honest `/properties` empty-state copy and CTA

## SEO marketing plan now built into Autopilot

1. Technical foundation
   - Keep every public page crawlable, indexable, canonical and present in sitemap.
2. Capture existing demand
   - Import Search Console metrics and convert low-CTR/striking-distance queries into action items.
3. Build topical authority
   - Strengthen society, sector, builder, rental and resale clusters using verified facts.
4. Convert organic visits
   - Audit CTA coverage and turn research traffic into shortlist, availability and site-visit flows.

## Guardrails preserved

- AI remains review-only.
- SEO drafts can be generated automatically, but public publication still requires admin approval/publish action.
- Published society SEO is not overwritten automatically.
- Search Console failures are recorded as warnings and do not destroy existing metrics.
- Sitemap generation still preserves the existing sitemap if the public API is unreachable.

## Validation

- `php artisan test --filter=SeoAutopilotTest`
  - Passed: 16 tests, 91 assertions
- `php artisan test`
  - Passed: 139 tests, 969 assertions
- `php artisan route:list --path=api`
  - Passed, 167 API routes listed
- `npm run seo:validate`
  - Passed
- `npm run build`
  - Passed
  - Sitemap script warned that the public API was unreachable from the sandbox and preserved the existing sitemap with 66 society URLs.

## Browser check

- Local Vite server started on `127.0.0.1:5174`.
- `/admin/seo-autopilot` correctly redirected to `/admin/login` without a local admin session.
- UI verification was completed through TypeScript/build and source-level checks.

## Known remaining risks

- The SEO Autopilot UI can be visually checked only after logging into local admin or deployed admin.
- Search Console automation depends on valid backend OAuth/token configuration.
- `frontend/src/pages/AIAdvisorPage.tsx` had large pre-existing dirty changes before this work; only a tiny validation-copy fix was added there.
- `frontend/public/sitemap.xml` was already dirty before this work and was not intentionally changed as part of the automation feature.

## How to use

Backend/manual:

```bash
php artisan migrate
php artisan seo:autopilot-run
```

Admin UI:

1. Open `/admin/seo-autopilot`.
2. Use **Run complete automation** to execute the full cycle.
3. Toggle automation modules from the Automation Engine card.
4. Review AI drafts in **AI Drafts**.
5. Publish only after review.

## Recommended next phases

- C124B — SEO Autopilot visual QA + deploy verification
- C124C — Search Console OAuth refresh hardening and reporting
- C124D — Organic landing-page internal-link automation
- C124E — Conversion tracking for organic leads/site visits
