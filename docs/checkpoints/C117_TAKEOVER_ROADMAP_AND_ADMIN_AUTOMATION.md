# C117 — Takeover Roadmap & Admin Automation Audit

Date: 2026-07-02
Baseline: `main` @ `1a6a883e` (tag `c116g-current-claude-handover`)
Companion doc: `docs/design/C117_MOBILE_FIRST_DESIGN_SPEC.md`

Live production verified today: 43 published societies, 0 public properties (intentional), backend healthy, search builder-grouping confirmed in the deployed `SearchPage` chunk and validated against the live API.

---

## 1. Findings the handover did not surface

1. **~20 published societies carry `source_confidence_score` of 0–35** (the legacy M3M structured-import batch was never re-enriched through the V2 pipeline). Their public pages show weak/"Review pending" confidence badges — this undercuts the platform's core trust pitch on almost half the inventory.
2. **6 published societies have no admin-approved cover image** (including DLF The Camellias / The Dahlias which have no Google Places photo match and need a manual rights-confirmed pick).
3. **Only 2 scheduled jobs exist** (`saved-searches:match` daily 08:00; AI-conversation pruning 03:15). Every other operational task — market refresh, SEO scoring, image checks, lead SLAs, sitemap drift, importer cleanup — is manual admin clicking.
4. **The queue is synchronous** while a dedicated `societyflats-worker` service already exists. This is why bulk AI operations are capped (e.g., re-enrich max 5/request to survive the gateway timeout). Moving to a real queue unlocks true bulk automation.
5. **Two parallel importers** remain in admin (legacy `AdminSocietyImportPage` + V2 `AdminVerifiedSocietyImporterPage`), doubling surface area and confusion.

## 2. Recommended order of work

### P0 — Operational hygiene (this week, small bounded commits)
1. **Sitemap reconciliation** — regenerate against the 43 live societies, verify 0 property URLs, validate, dedicated commit (the local file is stale/dirty; do not fold into anything else).
2. **Production smoke test** of importer Reject behavior (handover risk #2) — 5 minutes in the admin UI.
3. **M3M trust-data recovery** — bulk re-enrich the ~20 low-confidence societies through the V2 pipeline (batches of ≤5), re-approve covers/galleries, republish. Also fixes their 0-score confidence badges. Requires Anthropic/Gemini credit check first.
4. **Cover images for the 6 imageless societies** — manual admin picks with rights confirmation (2 need official-site image choices).

### P1 — Mobile-first design implementation (phases D1–D5 in the design spec)
App shell first (tab bar + sheets + PWA), then Search + Society page, then the rest. Each phase is an independent tagged release.

### P2 — SEO compounding
1. `render.yaml` rewrite audit for all prerendered routes (handover risk #8).
2. JSON-LD structured data rollout (design spec §5.2).
3. Society SEO content rollout — generate → human-review → publish, society by society (never bulk-publish). Target: all 43 published societies have published SEO content.

### P3 — Revenue plumbing
1. Real property onboarding from verified owner submissions (pipeline exists; `/sell` wizard feeds it).
2. Lead operations: SLA tracking + WhatsApp/callback workflow.
3. Referral/NRI operational QA before any messaging/money/document features.

### P4 — Automation suite (below) + importer consolidation + audit-trail hardening.

---

## 3. Admin backend audit

### 3.1 Structural improvements
| Issue | Recommendation |
|---|---|
| Two importers (legacy + V2) | Freeze the legacy import page behind a "Legacy" label now; fold remaining unique capabilities (URL/brochure fetch) into V2 as source layers; then remove. |
| Single shared admin token | Per-admin tokens with roles (viewer / editor / publisher). Publishing actions should be attributable. |
| No reviewer audit trail (risk #7) | Add `reviewed_by` + `reviewed_at` + rejection reason to importer review actions; store history, enable undo. |
| Generic society CRUD bypasses review gates (risk #6) | Guard publication-field changes in the generic update endpoint behind the same review workflow, or require a `confirm_publish_change` flag. |
| Admin navigation is 20 flat pages | Add an **Action Inbox** on the dashboard: one unified queue of pending items (importer fields/images, SEO drafts awaiting review, unanswered leads, referral/NRI cases, reviews) with counts and deep links. The daily digest (below) mirrors it. |
| Synchronous queue | Point `QUEUE_CONNECTION` to database, run `queue:work` on the existing worker; migrate bulk AI operations to queued jobs with progress polling (job records already exist for importer). Removes the 5-per-request cap. |

### 3.2 Automation candidates (scheduled)
All of these are additive `routes/console.php` `Schedule::` entries + small commands; none auto-publish anything — they prepare work and flag drift, honoring the review-gate rules.

| # | Job | Cadence | What it does | Effort |
|---|---|---|---|---|
| A1 | **Data-quality sweep + admin digest** | daily 07:30 | Scan published societies for: confidence <60, missing cover, missing published SEO, stale `updated_at` >90d, empty market fields. Write to a `admin_digests` table surfaced on the dashboard (email later). | S |
| A2 | **Sitemap drift check** | daily | Compare live sitemap society URLs vs published societies API; flag mismatch in digest. (Regeneration stays a deliberate build/deploy step.) | S |
| A3 | **Market-data refresh queue** | weekly, batched | Enqueue `market-refresh` for published societies with market data older than 30d; results land as review-flagged drafts, never direct-publish. Respects AI budget via per-run cap. | M |
| A4 | **Google Places photo reference re-validation** | weekly | Photo references go stale; HEAD-check each approved reference via the proxy, re-harvest broken ones into candidates for one-click re-approval. Prevents silent broken covers. | M |
| A5 | **Lead SLA watchdog** | hourly 9:00–21:00 | Flag leads with no status change 24h after creation; escalate at 72h; counts into digest/Action Inbox. | S |
| A6 | **Site-visit reminders** | daily 09:00 | The `site-visits/{id}/remind` endpoint exists — schedule automatic T-1day reminders instead of manual clicks. | S |
| A7 | **Saved-search match alerts** | extend existing | Matcher runs daily already; add outbound notification (email/WhatsApp template) and a dashboard badge for matched users. | M |
| A8 | **Importer job hygiene** | weekly | Prune completed import jobs >60d; auto-retry transient-failed enrichment layers once. | S |
| A9 | **Official-source link checker** | weekly | HEAD-check `official_*_url` fields on published societies; dead links → digest. | S |
| A10 | **SEO score refresh** | event-driven | Re-run `SocietySeoScoringService` automatically whenever a society or its SEO content is edited (model observer, not cron). | S |
| A11 | **Nightly DB backup verification ping** | daily | Confirm Render Postgres backup recency; alert in digest if stale. | S |
| A12 | **AI budget guard** | continuous | Track daily AI call counts/cost in cache; pause A3/bulk jobs when the daily cap is hit instead of failing mid-batch (billing outage happened before). | M |

**Suggested build order:** A1 + A2 + A5 + A6 (one small release, immediate ops value) → queue-worker switch → A3 + A4 + A12 → A7 → the rest.

### 3.3 Explicitly not automated (by design)
- Publishing anything (societies, SEO drafts, images, properties, referral rewards, NRI advice).
- Image rights confirmation.
- Deleting or shrinking data to match counts.

---

## 4. Success measures
- 43/43 published societies with confidence ≥60, approved cover, and published SEO content.
- Admin daily workflow starts from one Action Inbox; zero routine cron-able tasks done by hand.
- Mobile Lighthouse: Performance ≥90, SEO 100, LCP <2.0s on society pages.
- First real verified property live through the safe pipeline.
