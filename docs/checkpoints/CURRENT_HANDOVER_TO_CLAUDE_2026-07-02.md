# SocietyFlats — Current Complete Handover to Claude

Date: 2026-07-02
Timezone: Asia/Kolkata
Repository: `wassonnick/Final-Now`
Workspace: `/Users/wasson/Documents/GitHub/Final Now`
Branch: `main`
HEAD before this handover document: `a08eb822`
HEAD tag before this handover document: `c116f-fix-mobile-home-search`

## Copy-ready takeover instruction

You are taking over the live SocietyFlats.com project after the C116 and C113 importer/SEO work. Treat this file as the current source of truth and verify it against Git before editing. Do not rely on older checkpoint counts or old prompts that say Referral/NRI are absent, React 19 is installed, there are 40 societies, or there are 94 API routes.

Start with:

```bash
cd "/Users/wasson/Documents/GitHub/Final Now"
git status --short --branch
git log -12 --oneline --decorate
git diff -- frontend/public/sitemap.xml
```

Preserve the existing uncommitted `frontend/public/sitemap.xml` change until it is deliberately reconciled. It is stale and must not be included opportunistically in another commit.

## Current Git truth

- `main` is synchronized with `origin/main` at `a08eb822` before this handover document is committed.
- The only pre-existing modified tracked file is `frontend/public/sitemap.xml`.
- That sitemap modification does **not** belong to this handover and must not be overwritten, discarded, or committed incidentally.
- `.claude/` is intentionally ignored as local tool configuration.
- Continue the established release practice: validated work is committed, tagged, and pushed.

Recent commits and release tags, newest first:

| Commit | Tag | Purpose |
|---|---|---|
| `a08eb822` | `c116f-fix-mobile-home-search` | Mobile homepage search is now a real input; tapping no longer navigates immediately. |
| `150899a1` | `c116e-fix-importer-reject-actions` | Fixed Verified Importer field/image rejection behavior. |
| `df30c49d` | `c113e-fix2-public-seo-render-safety` | Prevented structured SEO arrays from crashing public society pages. |
| `6eba54e6` | `c113e-fix1-seo-property-publication-scope` | Removed invalid `properties.is_published` dependency from SEO facts/reporting. |
| `0bc51212` | `c113e-bulk-society-seo-readiness` | Added bulk SEO readiness and draft tools. |
| `5576f525` | `c113d-ai-society-seo-draft-generator` | Added Gemini/Claude review-only society SEO generation. |
| `df6496b0` | `c113c-public-society-seo-rendering` | Rendered published society SEO content publicly. |
| `e9e20889` | `c113b-admin-society-seo-studio` | Added the admin SEO Content Studio. |
| `b697ebcb` | `c113a-society-seo-backend-foundation` | Added society SEO storage, workflow, scoring and APIs. |
| `0aa79ce7` | `c113-fix4-importer-nearby-market-image-review` | Completed nearby, market, score and imported-image review layers. |

Earlier completed product phases are tagged:

- `c116a-api-seo-sitemap-stable`
- `c116e-importer-review-hardening`
- `c116d-real-property-inventory-pipeline`
- `c116b-referral-mvp`
- `c116c-nri-mvp`
- `c113-verified-society-importer-v2-foundation`

## Current production truth

Verified on 2026-07-02:

- Backend health: `ok` at `https://final-now.onrender.com/api/health`.
- Public societies API: **43** societies.
- Public properties API: **0** properties.
- Live sitemap: **89** URLs.
- Live sitemap society URLs: **43**.
- Live sitemap property-detail URLs: **0**.
- Laravel API route count: **138**.
- The live frontend bundle contains the `Submit search` marker from `c116f-fix-mobile-home-search`, so that frontend release is deployed.
- Authenticated importer Reject behavior was regression-tested locally but should receive one production admin smoke test after confirming the backend deploy is on `150899a1` or later.

No fake property inventory is permitted. Zero public properties is an intentional honest state, not missing seed data.

## Sitemap working-tree warning

There are three different sitemap states at handover:

| Sitemap | Total URLs | Society detail URLs | Property detail URLs |
|---|---:|---:|---:|
| Live production | 89 | 43 | 0 |
| Committed `HEAD` | 82 | 40 | 0 |
| Local modified file | 80 | 39 | 0 |

The local modified sitemap removes `dlf-alameda` and changes generated dates/content. It is stale relative to production. Do not treat it as authoritative. The correct reconciliation is to regenerate from the reachable live API, confirm 43 society URLs and zero property URLs, run SEO validation, then intentionally commit the resulting sitemap in a dedicated change. Do not silently shrink it or restore old data.

The sitemap generator is designed to preserve the last file when the API is unreachable or society counts fall below its safety threshold. Local builds in the Codex sandbox have recently logged an API-unreachable warning and preserved the existing file.

## Actual stack and deployment

### Frontend

- React `^18.3.1` — old prompts saying React 19 are stale.
- TypeScript `^5.5.0`.
- Vite `^6.0.0`.
- React Router, TanStack Query, Zustand, Tailwind and component libraries.
- Production: Render static service `societyflats-frontend`.
- Public domain: `https://www.societyflats.com`.
- Central API configuration: `frontend/src/config/api.ts`.
- Canonical production variable: `VITE_API_BASE_URL=https://final-now.onrender.com/api`.
- `VITE_API_URL` exists only as a central compatibility fallback and should not be spread into feature code.

### Backend

- PHP `^8.3`.
- Laravel `^13.8`.
- PostgreSQL on Render.
- Backend service: `societyflats-api`.
- Public API base: `https://final-now.onrender.com/api`.
- Scheduler worker: `societyflats-worker`; queue execution is currently synchronous.
- Gemini is the configured primary import/SEO provider; Claude support also exists.
- R2-backed uploads are configured through environment variables.

Never print or commit environment values, tokens, API keys, database credentials, or upload credentials.

## Product modules that now exist

Older handovers claiming these modules do not exist are obsolete.

### Verified Society Importer V2

Key areas:

- `frontend/src/pages/admin/AdminVerifiedSocietyImporterPage.tsx`
- `frontend/src/components/admin/VerifiedImportImageCard.tsx`
- `frontend/src/lib/verifiedImporterApi.ts`
- `backend/app/Http/Controllers/Api/Admin/VerifiedSocietyImporterController.php`
- `backend/app/Services/VerifiedSocietyImporter/`
- `backend/tests/Feature/VerifiedSocietyImporterTest.php`

Capabilities:

- Single, bulk and Excel draft import.
- Google Places enrichment and authenticated image preview.
- RERA/legal, builder/brochure, nearby and market source layers.
- Source tracking, confidence, duplicate handling and review queue.
- Deterministic review-only score generation.
- Manual image cover/gallery approval and rejection.
- Draft-only behavior and explicit review gates; no importer auto-publication.

Latest Reject fix:

- Rejecting an applied field now removes it from the society draft only when that exact importer value is still present.
- A later manual admin edit is preserved.
- Required identity fields are not blindly nulled.
- A verified-import image attached to an existing non-V2 society can be rejected.
- Rejecting such an attached image no longer unpublishes the existing society.
- V2-created societies remain Draft/Needs Review/unpublished through importer review actions.

Immediate production smoke test:

1. Open Verified Importer Review Queue.
2. Reject one disposable pending field and confirm it leaves the queue and is removed from the draft if still applied.
3. Reject one disposable image candidate and confirm it disappears from admin/public-use fields.
4. Do not use a unique production fact or approved live cover for this smoke test unless the user explicitly chooses it.

### Society SEO Content Engine

Key areas:

- `backend/app/Models/SocietySeoContent.php`
- `backend/app/Http/Controllers/Api/Admin/AdminSocietySeoContentController.php`
- `backend/app/Http/Controllers/Api/Admin/AdminSocietySeoReportController.php`
- `backend/app/Services/SocietySeoAiDraftService.php`
- `backend/app/Services/SocietySeoScoringService.php`
- `frontend/src/components/admin/SocietySeoStudio.tsx`
- `frontend/src/components/admin/SocietySeoReadinessPanel.tsx`
- `frontend/src/lib/societySeoContentApi.ts`
- `frontend/src/pages/SocietyPage.tsx`
- `backend/tests/Feature/SocietySeoContentTest.php`

Workflow:

- SEO content is separate from the legacy society description.
- Draft/AI content is not public until explicitly published.
- AI generation is review-only and refuses to overwrite published content without the guarded workflow.
- Public society APIs expose only published SEO content.
- Public pages tolerate both legacy structured arrays and normalized string arrays.
- Internal links accept AI `{anchor, path}` input but are normalized to safe relative `{label, url}` records.

Recent production failures already fixed:

- Do not query `properties.is_published`; that column does not exist. Use `Property::publiclyAvailable()`.
- Do not render structured SEO objects directly as React children. Existing production `nearby_highlights_json` can contain objects such as `{category, highlights}`.
- Raw database/provider errors should not be exposed in the admin UI.

### Real Property Inventory Pipeline

- The safe publication pipeline exists.
- Public inventory uses `Property::publiclyAvailable()` consistently.
- Live property publication requires verification, availability/publication timestamps, a published verified parent society, internal owner/authorised-broker contact and a real image.
- Public responses hide private owner/source fields.
- Production still has **zero** public properties.
- Populate only from real, consented owner/broker inventory. Never create fake cards, URLs or stock inventory.

### Referral MVP

- Private OTP-account referral submission/list flow exists.
- Admin referral review queue exists.
- Self-referral, duplicate and existing-account safeguards exist.
- Reward approval/payment remains admin-controlled and conversion-gated.
- No automatic payout or guaranteed reward language.

See `docs/checkpoints/C116B_REFERRAL_MVP.md`.

### NRI MVP

- Public consultation intake and private admin case queue exist.
- International email/WhatsApp and consent validation exist.
- No passport/PAN/bank/remittance document collection.
- No legal, tax, FEMA, banking, rent, resale or return guarantees.

See `docs/checkpoints/C116C_NRI_MVP.md`.

## Search and public frontend state

- Claude's builder grouping is preserved in `frontend/src/pages/SearchPage.tsx`:
  - exact/primary society first;
  - `More from {builder}` immediately afterward;
  - same-builder societies under that heading;
  - broader results afterward;
  - generic sector/locality searches remain normal.
- Do not remove this behavior during search work.
- Mobile homepage search in `frontend/src/components/home/SocietyFlatsHero.tsx` is now an actual editable search field.
- Verified at a 390×844 viewport:
  - typing `DLF Crest` leaves the user on `/`;
  - pressing Enter navigates to `/search?q=DLF+Crest&tab=societies`;
  - mobile suggestions use the same society data as desktop.

## SEO and public safety state

- Homepage has one H1.
- `/broker-crm` and `/recommendations` have route metadata.
- Protected account/dashboard pages are noindex.
- Unknown/empty locality and builder pages are conditionally noindex.
- Valid society, sector, builder, search, compare, AI, sell, trust and Gurgaon pages must remain indexable.
- `/properties` has an honest zero-inventory CTA and no fake cards.
- Static metadata is generated for 35 routes during build.

Deployment risk to audit: `frontend/scripts/prerender-static-meta.mjs` generates more routes than `render.yaml` explicitly rewrites. In particular, verify direct-request metadata delivery for `/nri-services`, `/investment-calculator`, `/builder-floors`, `/builder-portal`, `/trust`, `/privacy`, `/help` and `/chat`. Do not assume a generated HTML directory is served when the Render SPA fallback catches the route first.

## Validation baseline

Most recent passing checks:

- Full backend: **94 tests, 746 assertions**.
- Focused Verified Importer: **32 tests, 322 assertions**.
- Focused Society SEO: **8 tests, 42 assertions**.
- Frontend production build: passed.
- SEO validation: passed across 16 static HTML routes plus robots, sitemap, manifest, favicon, conversion copy and bundle splitting.
- Mobile homepage search: browser-verified at 390×844.

Run before every release:

```bash
cd "/Users/wasson/Documents/GitHub/Final Now/frontend"
npm run build
npm run seo:validate

cd "/Users/wasson/Documents/GitHub/Final Now/backend"
php artisan route:list --path=api
php artisan test

cd "/Users/wasson/Documents/GitHub/Final Now"
git diff --check
git status --short --branch
```

When validating the sitemap, require all current public society URLs and zero property-detail URLs while the public property API remains empty.

## Non-negotiable safety constraints

- Do not import fake properties.
- Do not restore old data merely to increase counts.
- Do not auto-publish societies, properties, SEO drafts, images, referrals or NRI cases.
- Do not weaken public publication filters or explicit review gates.
- Do not expose private owner, lead, referral or NRI contact data publicly.
- Do not print secrets or `.env` values.
- Do not approve image rights automatically.
- Do not redesign the product while fixing a focused bug.
- Do not break legacy admin/importer/AI/lead flows.
- Preserve unrelated working-tree changes.
- Do not trust old checkpoint data counts without a fresh live API check.

## Known remaining risks

1. The local sitemap is stale and dirty; reconcile it in a dedicated validated commit.
2. Production admin smoke verification is still needed for the latest importer Reject backend behavior.
3. Zero real public properties remains the largest product/content gap; the safe pipeline exists but real inventory must come from verified submissions.
4. Imported/AI society content quality still depends on human source and claim review; generators must not invent missing facts.
5. Historical image/source records created before review hardening are not automatically corrected.
6. Generic admin society CRUD can still change publication fields outside the stricter importer review workflow.
7. Import review completion uses a string status rather than reviewer identity/timestamp audit records.
8. The direct-request Render rewrite coverage for all prerendered routes needs an SEO deployment audit.
9. Referral messaging, consent receipts, reward terms and payout rails are intentionally incomplete.
10. NRI document handling, retention policy, specialist governance and international messaging are intentionally incomplete.

## Recommended next order

1. **Production smoke pass** — verify importer Reject, published society SEO rendering and mobile homepage typing on live.
2. **Sitemap reconciliation** — generate against 43 live societies, preserve zero property URLs, validate, commit separately.
3. **SEO deployment rewrite audit** — align `render.yaml` with every intended prerendered route.
4. **Importer audit trail hardening** — reviewer identity, timestamps, rejection reason/history and optional undo without weakening draft gates.
5. **Society SEO rollout** — generate/review/publish unique content society by society; never bulk-publish.
6. **Real property onboarding** — add only verified owner/broker drafts with real photos and consent.
7. **Referral/NRI operational QA** — validate policies, consent and admin operations before adding messaging or money/document features.

## Release discipline for Claude

For each bounded change:

1. Inspect and preserve the dirty sitemap unless the task is explicitly sitemap reconciliation.
2. Patch narrowly.
3. Run proportionate focused tests plus full build/test checks.
4. Review `git diff --check` and staged files.
5. Commit with a descriptive message.
6. Always create a release tag.
7. Push `main` and the tag explicitly.
8. Verify the live deployment marker or behavior before declaring the production issue closed.
