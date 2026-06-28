# SocietyFlats — Full-Site Content & Conversion Plan

Implementation-ready copy for every URL in `sitemap.xml`, built from the actual current site (not generic real-estate filler), organized around one user journey, with SEO metadata, trust signals, and CTA chains that funnel toward a single conversion: a lead/availability request, an AI Advisor shortlist, or an owner/broker signup.

Companion doc: [CONTENT_STRATEGY.md](CONTENT_STRATEGY.md) (the audit/why). This doc is the what-to-write.

---

## 0. Fix this first — two live pages are showing wrong/misleading content

Found while preparing this doc, independent of any opinion on copy quality — this is a correctness bug, not a style choice.

**The problem:** `SeoLandingPage.tsx` (the template behind every `/builder/{x}` and `/gurgaon/{locality}` page) falls back to *all* societies when a builder/locality has zero matches:
```
const bestSociety = scopedSocieties[0] || societies[0];          // line 534
<MetricPill label="Societies" value={String(scopedSocieties.length || societies.length || "Live")} />  // line 593
```
Right now, **only M3M has live inventory** (22 societies, sectors 65/67/68/70a/79/89/107/111/113). I checked all 18 templated pages against the live API:

| Page | Real matches | What it currently shows instead |
|---|---|---|
| `/builder/dlf` | 0 | "Best DLF societies in Gurgaon" headline, **an M3M society card** as the featured match, "22" in the Societies metric |
| `/builder/emaar`, `/builder/ats`, `/builder/godrej`, `/builder/adani`, `/builder/tulip`, `/builder/alpha-corp` | 0 each | same problem — every one of these 6 pages is currently showing an M3M society under the wrong builder's name |
| `/gurgaon/sector-56`, `/gurgaon/sector-66`, `/gurgaon/sector-102`, `/gurgaon/golf-course-road`, `/gurgaon/dwarka-expressway`, `/gurgaon/sohna-road` | 0 each | same fallback problem |
| `/builder/m3m`, `/gurgaon/sector-65`, `/gurgaon/sector-67`, `/gurgaon/sector-70`, `/gurgaon/golf-course-extension-road` | real matches (1–9) | working correctly |

This is the opposite of the trust impression the rest of the site works hard to build — a page titled "Best DLF societies" showing an M3M property is a credibility hit at exactly the wrong page type (an SEO landing page is the *first* impression for most of these visitors). It also means Google is indexing 13 pages with effectively duplicate content (every empty page currently renders near-identical fallback content).

**Recommended fix (small, code-level, not copy):** when `scopedSocieties.length === 0`, render an honest "more societies coming to this builder/area soon" state — no fallback card, no borrowed metric — with a CTA into `/search` or the AI Advisor instead of a fabricated match. Want me to implement this after you've reviewed the copy plan below? It's a ~15-line change in `SeoLandingPage.tsx` plus possibly pulling the 13 currently-empty URLs from `sitemap.xml`'s `preferredLocalityRoutes`/`preferredBuilderRoutes` until they have real data (the script already exists at `scripts/generate-sitemap.mjs`).

---

## 1. The user journey this content should drive

```
DISCOVER (SEO/organic)          COMPARE (consideration)        DECIDE (conversion)         AFTER
─────────────────────           ─────────────────────          ────────────────────         ─────
/gurgaon, /gurgaon/sector-65 →  /societies, /society/{x} →     Lead modal (any page) →      /trust (re-reassurance)
/builder/m3m, /insights      →  /compare, /ai-advisor      →   "Request availability"   →   /help (objection handling)
google search                   /properties, /property/{x}     /investment-calculator        WhatsApp/call follow-up
                                                                 (self-serve confidence)
```

Every page below is written to do three things: **answer the query that brought the visitor**, **prove a specific trust claim** (not a generic "we're trustworthy"), and **hand off to exactly one next step** — never two competing CTAs of equal weight. Where the current site offers two equal-weight buttons ("Search" / "Ask AI"), this plan keeps both but visually demotes the second to a text link, so there's one primary action per page.

---

## 2. Homepage (`/`)

**SEO title:** `Verified Gurgaon Societies — Compare Before You Choose a Home | SocietyFlats`
**Meta description:** `22+ Gurgaon societies reviewed field-by-field before publishing — real coordinates, real Google-sourced photos, no invented listings. Compare security, commute and price before you visit.`

**H1 (keep — it's good and on-brand):** "Find the *right* Gurgaon society before choosing the home."
**Subhead (sharpen):** *Current:* "Search verified society data, compare lifestyle, and request rental or resale options inside Gurgaon's top communities." → **New:** "Every society on this page passed a manual review — real coordinates, Google-sourced photos, no invented listings. Search, compare, then request a visit."

*Why the change:* the current subhead asserts "verified" abstractly; the new one names the three specific things that were checked (coordinates, photos, no fake listings), which is concrete enough to be falsifiable — that's what makes a trust claim land.

**Primary CTA:** "Search verified societies" (search bar, unchanged — it already works)
**Secondary CTA (demote to text link):** "Ask SocietyFlats AI instead →"

**New trust block to insert directly under the hero** (closes the "no social proof" gap from the audit — uses real, current numbers instead of vague claims):
> **22 societies live. 0 fabricated.**
> Every listing below has a Google-verified location, an admin-approved cover photo, and a visible data-confidence label. If something can't be confirmed yet, we say so instead of guessing.

**"Every society, verified" block — tighten the copy, same structure:**
- Admin-reviewed data → "A person checks every field before it goes live — not just an algorithm."
- Images reviewed → "Cover photos come from Google Places or the builder, never stock images."
- Refreshed regularly → "Price ranges are re-researched with live web search, not copy-pasted once and forgotten."

**Closing CTA band — currently repeats the hero H1 verbatim. Replace with:**
> H2: "22 societies in. Thousands more Gurgaon homes to compare."
> Sub: "Tell us your budget and commute — SocietyFlats AI narrows it to 2–3 societies worth visiting."
> CTA: "Get my shortlist" → `/ai-advisor`

---

## 3. Societies listing (`/societies` and `/gurgaon/societies`)

These two URLs currently serve near-duplicate intent (society directory). Keep both for now (sitemap already treats them as separate priority-0.9 routes) but differentiate the framing slightly so they're not literally the same page for two URLs:

**`/societies` — SEO title:** `All Verified Gurgaon Societies — Scores, Rent & Resale Ranges | SocietyFlats`
**H1 (keep):** "Explore verified societies in Gurgaon"
**Subhead (sharpen):** *Current:* generic feature list → **New:** "22 societies, each scored on security, connectivity, lifestyle and maintenance — not just listed. Sort by what actually matters to you."

**`/gurgaon/societies` — differentiate as the "directory by area" entry point:**
**H1:** "Every Gurgaon society SocietyFlats has reviewed, by sector"
**Subhead:** "Start from your sector or commute corridor, not an alphabetical list."

**Trust line to add on both (society count is real, update it via the same data the importer already tracks):** "Updated {last_import_date} · {count} societies live"

**Primary CTA per society card:** "View society" (unchanged — works)
**Empty/thin states:** if filtered results are 0 (e.g., user filters to a sector with no coverage), do **not** silently show all societies — show: "No societies in {filter} yet — try AI Advisor for the closest match" with a direct AI Advisor link. This mirrors the fix needed in §0.

---

## 4. Society detail page (`/society/{slug}`)

This is the highest-conversion-intent page on the site — visitor already picked a specific society. Current H1 is just the society name, which is correct (don't add filler above it), but the page is missing a mid-page conversion nudge.

**SEO title pattern:** `{Society Name}, {Sector} Gurgaon — Verified Profile, Price & Score | SocietyFlats`
**Meta description pattern:** `{Society Name} in {Sector}, Gurgaon: security score {X}/10, connectivity {Y}/10. Rent {rent_range}, resale {buy_range}. Reviewed by SocietyFlats admin, sourced via Google Places.`

**Keep:** H1 = society name, the "Data confidence: {level}" badge inline — this is good, specific, real.

**Add immediately under the fold (currently missing — the page describes the society but never asks for anything until the user scrolls far):**
> Sticky/inline CTA: "Get rent & resale availability for {Society Name}" → opens lead modal pre-filled with the society name.

**Add a "why this score" micro-explainer next to each of the 6 scores** (currently just numbers — turn them into trust evidence): e.g. hovering/expanding "Security: 9.7/10" should show *"Based on: 24×7 guarding, CCTV coverage, gated access, Google rating sentiment."* This uses data that's already computed (`score_breakdown` field exists on the Society model) but isn't surfaced — pure content/UI work, no new backend needed.

**Gallery caption (new):** under the photo gallery, add: "Photos via Google Places, reviewed and approved before publishing — not stock images." This single line does more trust work than any badge, because it's specific and checkable.

**Bottom-of-page CTA (replace generic "Request availability" with society-specific framing):**
> "Want to know what's actually available in {Society Name} right now?"
> CTA: "Request live availability" (primary) · "Compare with another society" (text link → `/compare?a={slug}`)

---

## 5. Properties listing (`/properties`, `/gurgaon/properties`) & property detail (`/property/{slug}`)

**`/properties` H1 (sharpen):** *Current:* "Discover verified Gurgaon properties" → **New:** "Homes inside societies SocietyFlats has already reviewed"
**Subhead:** "Every home below sits inside a society we've checked for security, access and maintenance — not a random address."

*Why:* this is the single highest-leverage line on the whole properties page, because it's the one sentence that explains *why this listing page is different from 99acres/NoBroker* — the audit (§4 of CONTENT_STRATEGY.md) flagged this exact gap. Properties pages are usually commoditized; this framing is the differentiator.

**Property detail SEO title pattern:** `{BHK} {Property Type} for {Rent/Sale} in {Society Name}, {Sector} | SocietyFlats`
**Property detail CTA (primary):** "Request a visit" — keep specific to the unit, not generic "Contact us."
**Add (currently missing):** a one-line link back to the society profile near the top: "Inside {Society Name} → see security score, commute & resident fit" — properties currently dead-end without reinforcing the society-first thesis that's supposed to be the whole point of the product.

---

## 6. Builder pages (`/builder/{slug}` × 8)

Template lives in `SeoLandingPage.tsx`. Per §0, **7 of these 8 pages currently have zero real inventory** — the copy plan below assumes §0's empty-state fix ships first; otherwise this is polishing a page that's actively misleading.

**For `/builder/m3m` (the one with real data) — SEO title:** `M3M Societies in Gurgaon — 22 Verified Projects Compared | SocietyFlats`
**H1 (replace generic):** *Current:* "Best M3M societies in Gurgaon" → **New:** "M3M built 22 of the societies SocietyFlats has reviewed in Gurgaon"
**Subhead:** "From Golf Course Extension Road to Sector 113 — compare M3M's projects by security, connectivity and price before picking one."
**Insight block (replace generic boilerplate):** *Current:* "M3M projects can vary sharply by micro-market, maintenance, access and inventory depth..." (this line is reused verbatim for every builder, just swapping the name — that's the generic-template problem the audit flagged) → **New, M3M-specific and falsifiable:** "M3M's portfolio here spans ultra-luxury (Golfestate, Trump Towers) to mid-segment serviced suites (SkySuites, Polo Suites) — the same builder name covers a wide price range, so compare the *society*, not just the brand."

**For the other 7 builder pages, once real inventory exists (or as a template default before then):** Generic CTA copy is currently "Search {Label} societies" — weak because it just restates the page title as a button. **Replace with an outcome-framed CTA:** "See which {Builder} societies fit your budget" → same destination (`/search?q={builder}`), stronger because it implies a filtered result, not a generic search.

**Until real data exists for the other 7, the honest version of this page is:** H1 stays the same, but the body explicitly says: "SocietyFlats hasn't reviewed a {Builder} society in Gurgaon yet — tell us what you're looking for and we'll prioritize it." with a lead-capture CTA, not a fabricated listing. This turns a thin/broken page into a legitimate demand-signal capture page, which is actually a stronger SEO and business outcome than a fake-content page.

---

## 7. Sector / corridor pages (`/gurgaon/{locality}` × 10)

Same template, same problem as §6 — 6 of 10 are currently empty/misleading (see §0 table).

**For `/gurgaon/sector-65` (9 real matches, the strongest page) — SEO title:** `Sector 65 Gurgaon Societies — M3M Golfestate, Skycity, Heights & More | SocietyFlats`
**H1 (replace generic "Top societies near Sector 65"):** "Sector 65 has more reviewed M3M societies than anywhere else in Gurgaon"
**Insight block (specific, not the reused "Two societies in the same sector can feel very different..." line):** "Golf Course Extension Road runs through Sector 65, which is why M3M concentrated nine projects here — but Golfestate, Skycity and Heights still differ by 9+ points on connectivity score. Compare them side by side before assuming 'Sector 65' means one thing."

**For the 6 currently-empty corridor pages:** same honest-gap treatment as builder pages — "No reviewed societies in {Locality} yet" + lead capture, not a fallback card.

---

## 8. Compare page (`/compare`)

**SEO title (current is fine, tighten slightly):** `Compare Gurgaon Societies Side-by-Side — Score, Rent, Resale | SocietyFlats`
**H1 (keep, it's good):** "Compare societies"
**Subhead (keep, it's good):** "Side by side across the things that actually decide where you live."
**Add (currently missing entirely):** a single proof line under the subhead, since this page has zero trust content right now: "Every column below comes from the same admin-reviewed dataset — nothing here is estimated on the spot." 
**Empty-state CTA when fewer than 2 societies selected:** "Pick a second society to compare" (currently likely just an empty grid — confirm and add explicit prompt if missing).

---

## 9. AI Advisor (`/ai-advisor`)

**SEO title (current is solid):** `SocietyFlats AI Advisor | Smart Gurgaon Home Search`
**H1 (keep):** "SocietyFlats AI Advisor"
**Subhead (keep — "not a black box" is a strong, specific trust line, don't touch it):** "A local expert that reasons from verified society data — not a black box."
**Add immediately under the subhead (currently missing — the page never explains *what data* it reasons from, which undercuts the "not a black box" promise):** "It only recommends from the 22 societies SocietyFlats has published and reviewed — it will tell you when nothing fits well, instead of forcing a match."
**Sample prompts (keep the existing three, they're well-written and specific):** "Best societies near Cyber City under ₹80k rent" / "Family-friendly societies near good schools" / "Compare my shortlisted societies"

---

## 10. Insights (`/insights`)

**SEO title (current is good):** `Gurgaon Real Estate Market Insights | Property Values & Rental Trends`
**H1 (current is decent, sharpen the trust word):** *Current:* "...with clear verification labels." → **New:** "Gurgaon rent and resale trends, labeled by how confident we actually are in each number."
*Why:* "clear verification labels" is abstract; naming the actual mechanic ("labeled by how confident we are") is the same honesty pattern that works everywhere else on the site.
**Add (ties directly to the new Claude-grounded market-data tooling already built this session):** a visible per-society "Market data confidence: {high/medium/low} · sourced {date}" line wherever rent/resale ranges are shown — this data already exists in `field_sources.market` on the Society model, just needs surfacing.

---

## 11. Sell / owner listing (`/sell`)

**SEO title (current is strong, keep):** `List Your Gurgaon Flat | Connect with Verified Buyers & Tenants Directly`
**H1 (current is good, keep):** "Own a premium apartment in Gurgaon? List your property directly."
**Subhead (current is good, keep):** "We match your home with pre-qualified buyers and tenants who are already researching your specific society. Skip endless broker calls and listing spam."
**Add (currently missing — owners have a different trust question than renters: "will my number get spammed?"):** a one-line guarantee directly above the form: "Your number is shared only when a verified enquiry matches your listing — never sold, never bulk-shared." (This already exists as a homepage promise — "No spam—your number is used only for verification and enquiries" — just needs to be repeated here, at the actual decision point, not just on the homepage cross-sell card.)

---

## 12. Builder/RWA portal (`/builder-portal`)

**SEO title (current is fine):** `Builder & RWA Portal | SocietyFlats`
**H1 (currently has none stated — check and add):** "Claim your society's profile on SocietyFlats"
**Subhead:** "Submit corrections, official updates, or claim management of your society's public listing — reviewed before anything changes live."
**Primary CTA:** "Claim a society" / **Trust line:** "Changes go through the same admin-review workflow as new listings — nothing publishes instantly."

---

## 13. Builder floors (`/builder-floors`)

**SEO title (current is fine):** `Builder Floors in Gurgaon | SocietyFlats`
**H1:** "Independent builder floors, reviewed the same way as full societies"
**Subhead:** "Builder floors skip the maintenance and security infrastructure of a gated society — see what you're trading off before you decide."
*Why:* this page currently has no differentiated thesis; "what you're trading off" gives it one, consistent with the society-first positioning instead of just being a category filter.

---

## 14. Investment calculator (`/investment-calculator`)

**SEO title (current is good):** `Rental Yield Calculator | SocietyFlats`
**H1 (current is good, keep — "without hiding the assumptions" is an excellent, specific trust line):** "Rental yield and multi-year ROI calculator"
**Subhead (keep verbatim):** "Model acquisition costs, operating expenses, rent and appreciation without hiding the assumptions."
**Add:** a single CTA after the calculator output (currently likely a dead-end tool with no next step): "See which societies match this budget" → `/search?tab=buy&budget={calculated}`.

---

## 15. Chat (`/chat`)

**SEO title (current is fine):** `Gurgaon Society AI Chat | SocietyFlats`
**H1:** "Ask anything about Gurgaon societies"
**Subhead:** "Grounded in 22 published society profiles — it'll say 'I don't have that yet' instead of inventing an answer."

---

## 16. Recommendations (`/recommendations`)

Currently has no distinct H1/copy strategy noted — likely a results view fed by the AI Advisor. **H1:** "Your shortlist" / **Trust line per result:** "Matched on {criteria} · data confidence {level}" — every recommendation should show *why* it was suggested, reinforcing "not a black box" from §9.

---

## 17. Trust (`/trust`)

Already excellent (`PublicInfoPage.tsx`) — **do not rewrite**, only extend. Current H1: "What admin-reviewed society data actually means." is the strongest, most specific headline on the entire site. **One addition:** since §0/§6/§7 expose that some pages currently show fallback/empty content, this page should be the place that explains it honestly once the fix ships: add a 5th step to "How we publish a society" — *"Coverage is still growing — we'd rather show fewer, real societies than pad listings with unreviewed ones."* This pre-empts the exact objection a sharp visitor would have after noticing thin builder pages.

---

## 18. Help (`/help`) and Privacy (`/privacy`)

Both already solid and on-brand (same `PublicInfoPage.tsx` system) — no rewrite needed. Just confirm the FAQ list grows alongside the new builder/locality empty-state behavior: add "Why does a builder or area page show no societies?" → "We only publish what's been reviewed — empty means not reviewed yet, not unavailable. Tell us what you need and we'll prioritize it."

---

## 19. CTA library — stop varying button copy randomly

Current site uses at least 6 different phrasings for what is functionally the same action (start a search). Standardize to this hierarchy so every page reinforces the same verbs:

| Intent | Use this exact phrase | Not this |
|---|---|---|
| Start a search | "Search verified societies" | "Search M3M societies" / "Search Sector 65" (these read as if results are pre-filtered to *only* that builder/sector with nothing else — fine on a results page, weak as a CTA label) |
| Go to AI Advisor | "Ask SocietyFlats AI" (homepage) → demote elsewhere to a text link "or ask AI instead →" | "Open AI shortlist" / "Build my shortlist" (pick one, currently both exist) |
| Society-specific lead | "Request live availability" | "Request availability" (add "live" — it's the one word that signals this isn't a stale form) |
| Owner listing | "List your flat" | keep — already consistent |
| Broker | "Become a partner" | keep — already consistent |

---

## 20. What to do next

1. Decide on §0's fix (empty/misleading SEO pages) — this is the one item here that's a bug, not a copy opinion, and it's currently live in production.
2. Tell me which sections to implement first — I'd suggest §0 → §2 (homepage, highest traffic) → §4 (society detail, highest conversion intent) → the rest.
3. Once §0 ships, re-run `npm run seo:sitemap` so `sitemap.xml` reflects only real, indexed-worthy URLs (it already pulls live societies from the API — it's just stale from before today's import/delete).
