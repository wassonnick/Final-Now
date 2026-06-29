# SocietyFlats — C116A API, SEO and Sitemap Stabilization

Date: 2026-06-30  
Phase: C116A  
Branch: `main`  
HEAD before work: `830d70ed0d4d4467a876d007e5b17074db0a8c8e`

## Starting State

- The branch was synchronized with `origin/main`.
- `frontend/src/pages/SearchPage.tsx` already contained an uncommitted Claude change that introduced a `More from {builder}` result group.
- `.claude/launch.json` was untracked.
- Production exposed 40 published societies and zero published properties.
- The deployed sitemap had 40 society URLs and zero property URLs, while the committed sitemap was stale at 22 society URLs.

## What Was Preserved From Claude

- Exact society-name matches remain the primary search results.
- `More from {builder}` remains immediately after the primary match.
- Generic searches such as `Sector 65` remain a flat result list without a builder heading.
- The grouping was narrowed so only the primary builder's societies appear below that heading. Builder legal-name variants such as `DLF`, `DLF Limited` and `DLF Homes (DLF Limited)` are treated as one builder for grouping.
- Broader matches, when present, appear afterward under `Other matching societies`.

## C116A Changes

### API configuration

- Added one frontend API base helper in `frontend/src/config/api.ts`.
- Standardized production configuration on `VITE_API_BASE_URL=https://final-now.onrender.com/api`.
- Retained `VITE_API_URL` only inside the central helper as a temporary compatibility bridge.
- Updated frontend consumers, Render configuration, Docker configuration and deployment documentation.
- Added a safe fallback for `liveBackendApi.ts` through the central helper.

### SEO metadata

- Reduced the homepage hero to one DOM H1.
- Updated homepage launch copy to 40+ societies and made the closing society count use live public data.
- Added route-specific metadata and prerender output for `/broker-crm` and `/recommendations`.
- Added explicit noindex metadata to customer, owner and broker dashboards.
- Added conditional noindex behavior for empty/unknown builder and locality pages while keeping valid populated pages indexable.

### Sitemap safety

- Sitemap generation now refuses to replace the sitemap when the public society count falls below a configurable safety threshold.
- API failure preserves the last healthy sitemap instead of writing a static-only fallback.
- SEO validation now requires a minimum count of public society URLs.
- The regenerated sitemap contains 81 URLs: 40 society detail URLs, zero property detail URLs, plus the new broker route.
- A forced API-failure check confirmed that the healthy sitemap remains byte-for-byte unchanged.

### Honest zero-inventory conversion

- `/properties` now states that no verified homes are published and explicitly says SocietyFlats does not show fake listings.
- Added a request-current-availability lead modal instead of fake property cards.

### Git hygiene

- `.claude/` is ignored because its launch/settings files are local tooling rather than intentionally shared project configuration.

## Current Data State

- Public societies: 40.
- Public properties: 0.
- Sitemap society URLs: 40.
- Sitemap property URLs: 0.
- No data was imported, restored, published or deleted during C116A.

## Validation

- Frontend production build: passed.
- SEO validation: passed; 15 static HTML routes plus public assets and conversion checks.
- Backend API route list: passed; 94 routes.
- Backend tests: passed; 43 tests and 291 assertions.
- Rendered local checks passed for:
  - exact DLF search grouping;
  - generic Sector 65 search;
  - one homepage H1;
  - honest properties empty state and CTA;
  - broker and recommendations metadata;
  - unknown builder noindex;
  - valid DLF builder index metadata.

## Known Remaining Risks

- Importer structured/pipeline flows can automatically approve image candidates; explicit admin image review should be hardened next.
- Importer publish checks do not yet require a separate completed-review state.
- Real verified property inventory is still empty.
- Old historical handover documents describe obsolete feature and deployment states and should not be treated as current truth.
- `VITE_API_URL` compatibility can be removed after every deployment environment has migrated to `VITE_API_BASE_URL`.

## Recommended Next Phases

1. C116E — importer review hardening.
2. C116D — real property inventory pipeline.
3. C116B — referral MVP.
4. C116C — NRI MVP.

## Commit And Tag Recommendation

```bash
git add .gitignore DEPLOYMENT_GUIDE.md DEVELOPMENT_HANDOFF_2026-05-30.md PROJECT_FREEZE_HANDOVER.md README.md docker-compose.yml render.yaml frontend docs/checkpoints/C116A_API_SEO_SITEMAP_STABILIZATION.md
git commit -m "Stabilize API SEO sitemap and builder search grouping"
git tag c116a-api-seo-sitemap-stable
```

