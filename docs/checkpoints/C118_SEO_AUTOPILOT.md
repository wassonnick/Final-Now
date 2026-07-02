# C118 — SEO Autopilot

## Release baseline

- Starting branch: `main`
- Starting HEAD: `647299c6` (`C117E search mobile: floating map pill and full-screen map view`)
- Starting tag: `c117e-d2b-search-mobile-map`
- Existing C113 society SEO studio, publication controls, importer, search, lead and property workflows were preserved.
- Sitemap at build time contains 43 public society URLs and is failure-safe when the API cannot be reached.

## What shipped

SEO Autopilot adds an admin-only command center at `/admin/seo-autopilot` with:

- persistent page inventory for societies, properties, sectors, builders, rent/buy, comparison and guide pages;
- 100-point page audits, technical checks and prioritized SEO tasks;
- canonical builder grouping so variants such as DLF Limited and DLF Homes map to `/builder/dlf`;
- first-party keyword clusters and URL mapping without fabricated search volume or difficulty;
- optional Google Search Console import, including low-CTR and positions 4–20 opportunities;
- deterministic drafts plus optional Gemini/Claude-compatible improvements;
- before/after review, editing, approval, rejection, regeneration and separate explicit publication;
- internal-link suggestions, safe WebPage schema, daily/weekly/monthly reports and change logs;
- scheduled page/technical audits, keyword refreshes, Search Console imports and reports;
- published generic landing-page overrides consumed by the existing public SEO landing page.

The database migration creates `seo_pages`, `seo_audits`, `seo_tasks`, `seo_keywords`, `seo_search_console_metrics`, `seo_drafts`, `seo_change_logs` and `seo_reports`.

## Publication and data safety

- AI never publishes automatically.
- Draft generation, approval and publication are three distinct actions.
- Existing published society SEO cannot be overwritten without an explicit unpublish first.
- Society draft approval applies content as `approved`; it remains non-public until publication.
- Generic landing drafts remain invisible to the public resolver until explicitly published.
- Schema is generated deterministically from the registered page and cannot be replaced by model output.
- Sector and builder drafts require at least two published societies.
- Prices, availability, distances, RERA and legal claims are omitted unless already present in reviewed records.
- No properties or fake inventory were created.
- Publishing creates a high-priority sitemap refresh/validation task; it does not silently rewrite the sitemap.

## Operations

Commands:

```bash
php artisan seo:autopilot-audit
php artisan seo:autopilot-keywords
php artisan seo:autopilot-search-console
php artisan seo:autopilot-report daily
php artisan seo:autopilot-report weekly
php artisan seo:autopilot-report monthly
```

Search Console is optional. Configure `GOOGLE_SEARCH_CONSOLE_SITE_URL` and `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` in Render for the API and scheduler worker. No credential is stored in Git. Without configuration, existing metrics are preserved and the rest of the module continues to work.

Production migration runs through `backend/docker/start.sh` with `php artisan migrate --force`.

## Validation

- Frontend build: passed.
- SEO validation: passed.
- Backend suite: 106 tests, 815 assertions, passed.
- SEO Autopilot focused suite: 12 tests, 69 assertions, passed.
- API route list: 156 routes, including the protected Autopilot API and public published-content resolver.
- Scheduler list: all seven Autopilot schedules registered.
- Sitemap generation: API-unreachable simulation preserved the existing sitemap with 43 society URLs rather than shrinking it.

## Known risks and follow-up

- Search Console requires a valid short-lived access token or a future service-account refresh implementation.
- Technical audits make real requests to production and should remain scheduled off-peak.
- Published generic landing overrides are client-applied after the static HTML loads; a future server-side/prerender integration would improve first-response metadata for crawlers.
- Sitemap refresh after SEO publication remains intentionally reviewable. Resolve its task only after regeneration and URL-count validation pass.
- Monitor the first production migration and first scheduled audit in Render logs.

## Release

Recommended commit: `Build review-safe SEO Autopilot command center`

Recommended tag: `c118-seo-autopilot`
