# C117 — SocietyFlats Mobile-First Design Specification

Date: 2026-07-02
Status: Approved direction, implementation phased (see roadmap doc)
Scope: Complete premium mobile-first design covering every live platform feature, SEO architecture, and competitive positioning.

---

## 1. Design thesis

SocietyFlats is not a listings portal. It is a **verified society intelligence product** that happens to route rentals and resales. Every design decision must reinforce one promise:

> "Everything you see here is real, reviewed, and honest — including what we don't know yet."

The mobile experience should feel like a **premium native app** (Airbnb Luxe calm + Apple clarity), not a responsive website. Competitors (99acres, MagicBricks, Housing, NoBroker) are dense, ad-cluttered, broker-spam-first. Our edge is *restraint + verifiable truth*.

### Non-negotiables carried from product safety rules
- No fake listings, no fake counts, no fake urgency ("3 people viewing!").
- Data-confidence labels stay visible — they are a feature, not a disclaimer.
- Zero-inventory states stay honest (curiosity CTA, never fake cards).

---

## 2. Design tokens (existing palette, formalized)

| Token | Value | Usage |
|---|---|---|
| `--pine-900` | `#123C32` | Primary actions, headings-on-light, tab active |
| `--pine-700` | `#2A6147` | Links, secondary emphasis, verified icons |
| `--ink-900` | `#10251F` | Display headlines |
| `--ink-700` | `#25302B` | Body text |
| `--ink-500` | `#6E756E` | Secondary text, labels |
| `--cream-bg` | `#F8F3EA` | App background |
| `--cream-card` | `#FFFBF3` | Elevated warm surfaces |
| `--sand-border` | `#E7DCCB` | Hairlines, card borders |
| `--mint-bg` | `#EEF5F1` | Trust/verified surfaces |
| `--mint-chip` | `#E8F7E9` | Confidence/verified chips |
| `--copper` | `#C2724E` | Primary CTA accent ("List Your Flat"), focus dot |
| `--whatsapp` | `#449B4E` | WhatsApp actions only |

**Typography.** Display serif (current `font-display`) for page titles and society names only; system-sans for everything else. Mobile scale: Display 28/34, H2 19/26, body 14.5/24, caption 12/16, chip 11.5. Never more than two sizes per card.

**Shape & elevation.** Radius: cards 16px, sheets 20px top-only, pills 999px, inputs 12px. One shadow token: `0 14px 36px -26px rgba(0,0,0,.4)`. No borders + shadow together except sticky bars.

**Motion.** 200ms ease-out standard; bottom sheets 280ms spring; skeleton shimmer for loading (never spinners on content areas); haptic-feel scale (0.98) on card press.

---

## 3. App shell (the biggest single change)

Replace the current "responsive website" chrome with a native-app shell on <1024px:

### 3.1 Bottom tab bar (persistent, 5 tabs)
| Tab | Icon | Route | Notes |
|---|---|---|---|
| Home | house | `/` | Brand + discovery |
| Search | magnifier | `/search?tab=societies` | The workhorse |
| AI Advisor | sparkle | `/ai-advisor` | Center, slightly raised — signature feature |
| Saved | heart/scale | shortlist + compare tray | Badge = compare count |
| Account | person | customer/owner/broker dashboard by role | Login-aware |

- Height 64px + safe-area inset; frosted `bg-white/95 backdrop-blur`.
- Already partially exists on some pages — make it a single `MobileTabBar` component mounted in the public layout, active-state driven by route.
- "List Your Flat" leaves the nav bar and becomes a copper FAB-style entry on Home + Account, and a persistent card in Search empty states.

### 3.2 Top bar behavior
- Home: logo + notification bell (site-visit updates) only. Search lives in the hero, not the header.
- All other screens: back chevron + screen title + contextual action (share/heart). Collapses on scroll (large-title → 44px compact).

### 3.3 System behaviors
- **PWA**: manifest exists — add `display: standalone`, theme color `#F8F3EA`, iOS status-bar style, install prompt shown after 2nd visit (never on first).
- Pull-to-refresh on Search and dashboards.
- Bottom sheets replace modals for: filters, lead capture, compare tray, image gallery actions, sort.
- Skeletons match final layout exactly (no layout shift — this is also a CWV requirement).

---

## 4. Screen-by-screen specification

### 4.1 Home `/`
Order (mobile):
1. **Hero**: one-line promise ("Find the right Gurgaon society before choosing the home."), the real search input (kept from c116f — typing stays on page, Enter navigates), 3 AI prompt chips.
2. **Trust strip**: "43 societies live · 0 fabricated" (live count, already fixed) as a horizontally scrollable proof row: RWA reviewed / Admin-reviewed data / Images reviewed / Market refreshed.
3. **Verified societies carousel**: photo cards (only societies with approved Google photos), score badge, confidence chip, rent/buy mini-row. Horizontal snap-scroll, 85% card width.
4. **Browse by intent**: 4 large tap targets — Rent, Buy, New Launch, NRI Services.
5. **Popular localities**: chip grid (Golf Course Rd, Sector 54…) → SEO landing pages.
6. **AI Advisor teaser**: single conversational card ("3 BHK near Cyber City under ₹80k?") that deep-links with the query prefilled.
7. **Owner strip**: "Own a flat in these societies?" → `/sell` wizard.
8. FAQ (schema-backed, collapsed accordions) + compact footer.

### 4.2 Search `/search` (workhorse)
- **Sticky compact header**: back + query pill + filter icon with active-count badge. Tapping query pill opens full-screen search takeover with recent searches + suggestions.
- **Tabs**: Societies / Rent / Buy as segmented control under header.
- **Result grouping (already live — keep)**: primary name match → "More from {builder}" → "Other matching societies".
- **Cards**: image (approved only, else branded placeholder), name, sector, score chip, rent+buy mini table, single primary CTA "View Society"; Compare and Callback demoted to icon row.
- **Map**: not side-by-side on mobile. Floating "Map" pill (bottom center, above tab bar) flips to full-screen map with card carousel over it — the 99acres-killer interaction done calmly.
- **Filters**: bottom sheet — intent, locality chips, budget slider, score minimum, "has verified photos" toggle. Applied filters render as dismissible chips under the header.
- **Zero results**: honest empty state + lead capture sheet + "Ask AI to widen this search".

### 4.3 Society page `/society/{slug}` (flagship — most SEO traffic lands here)
1. **Gallery**: full-bleed swipe gallery (approved photos), dots, photo count, "Photos via Google Places, reviewed" caption. Placeholder art if none (never stock).
2. **Title block**: serif name, sector link, builder link, score, confidence chip (`{n}% verified`), updated date.
3. **Sticky action bar** (appears after scrolling past title, above tab bar): Resale ₹X–Y · Rent ₹X–Y + "Check availability" copper button + WhatsApp icon.
4. **Verified facts grid**: 2-col cards (Units, Towers, Possession, Status, Maintenance, Builder, RERA, Confidence). Unknowns say "To be reviewed" — keep.
5. **Score panel**: 5 sub-scores as horizontal bars with one-line "why" from `score_breakdown` signals (deterministic engine is a differentiator — show its work).
6. **Published SEO content** (c113): about, locality guide, FAQs — rendered as collapsible sections so the page stays scannable; fully in DOM for SEO.
7. **Location intelligence**: static map snapshot first (fast LCP), tap to activate live map with nearby chips (schools/metro/hospitals/offices with measured distances).
8. **Amenities**: chip cloud, +N more expander.
9. **Available homes**: real properties only; while zero — "No verified homes listed right now" + "Get notified" (saved-search creation) + request-availability CTA.
10. **Reviews + rent history chart** (existing modules) → **Similar societies** (same sector/builder — internal-link mesh) → lead form.

### 4.4 Compare `/compare`
- Mobile: 2 societies side-by-side max (3 on ≥400px), sticky society headers, rows grouped Trust / Pricing / Scores / Nearby / Best for.
- Winner highlighting per row (subtle mint fill on the better value).
- "Ask AI who wins" button → AI Advisor with both slugs prefilled.
- Compare tray is a bottom sheet reachable from the Saved tab; add/remove without leaving Search.

### 4.5 AI Advisor `/ai-advisor`
- Full chat surface, first-run shows 6 tappable intents (budget, commute, family, pets, NRI, investment).
- Answers must cite platform data: response cards embed real society mini-cards (tap → society page). "Based on 43 verified societies" grounding line.
- Session continuity via existing token API; shareable conversation link.

### 4.6 List Your Flat `/sell` (owner wizard)
- Keep the 8-step auto-advancing wizard (phone → name → society → intent → details → photos-later → availability → review).
- Add: society autocomplete against live societies in step 3; progress persistence in localStorage; step count visible ("2 of 8"); trust microcopy under phone step stays.
- Post-submit: dashboard handoff card with verification-status timeline (Submitted → Verifying → Live).

### 4.7 Properties `/properties` + property page
- Honest zero-state stays until real inventory (safety rule).
- When live: same card DNA as societies; every property card shows its parent-society chip (society-first identity); listing badges only "Owner-verified" / "Broker-verified".

### 4.8 Referral `/refer`
- One-screen mobile flow: hero explaining conversion-gated rewards (no guaranteed-money language — compliance), referral form, "My referrals" status list (Submitted / In review / Converted / Rewarded).

### 4.9 NRI Services `/nri-services`
- Positioned as concierge: what we do / don't do (no document collection, no guarantees — keep compliance copy), consultation intake with international phone + consent, WhatsApp-first follow-up expectation, timezone note.

### 4.10 Dashboards (customer / owner / broker)
- Card-stack layout: next site visit, saved searches with new-match badges (backend matcher already runs daily — surface it here), shortlists, my listings w/ verification status, referrals.
- Broker CRM stays desktop-optimized; mobile gets read + status-update actions only.

### 4.11 Insights, Investment calculator, Maps, Trust, SEO landing pages
- Calculator: full-width steppers, sticky result card, share-as-image.
- Sector/builder landing pages: mobile hero + society grid + written locality guide (SEO content engine output) + FAQ schema; these are the programmatic-SEO backbone.
- Trust page: link it from every confidence chip (chip tap → "How we verify" sheet with link).

---

## 5. SEO architecture (mobile-first = SEO-first)

Google indexes the mobile experience. The design above is also the SEO plan:

1. **Rendering**: keep build-time prerendered metadata (35 routes) + published-society SEO content server-visible. Close the `render.yaml` rewrite gap (handover risk #8) so every prerendered route is actually served.
2. **Structured data** (add; per-page JSON-LD):
   - Organization + WebSite + SearchAction (home)
   - `ApartmentComplex`/`Residence` + `Place` + `AggregateRating` (society pages — name, geo, address, amenityFeature, numberOfUnits)
   - `BreadcrumbList` everywhere (Home › Gurgaon › Sector 54 › DLF The Crest)
   - `FAQPage` on society + landing pages (SEO content engine already produces FAQs)
   - `RealEstateListing` for properties when inventory goes live
3. **Internal-link mesh** (already partially built — complete it): society → sector page → builder page → similar societies → compare pairs. Every society page should emit ≥8 crawlable internal links.
4. **Title/meta templates**:
   - Society: `{Name}, {Sector} — Verified Rent & Resale Prices, Reviews | SocietyFlats`
   - Sector: `Top Verified Societies in {Sector} Gurgaon ({count} reviewed) | SocietyFlats`
   - Builder: `{Builder} Societies in Gurgaon — Verified Data & Prices | SocietyFlats`
5. **Core Web Vitals budget** (mobile): LCP < 2.0s (static map snapshot instead of live map at load; width-sized Google photo proxy; font preload), CLS < 0.05 (skeletons sized exactly), INP < 200ms (defer map + chart chunks — already code-split).
6. **Sitemap**: reconcile the stale local file (dedicated commit), then automate drift detection (see admin automation doc). Society URLs must always equal the live published count; property URLs stay 0 until real inventory.
7. **E-E-A-T moat**: the confidence system, "sources reviewed" labels, and Trust page are literal experience/expertise/trust signals — link them visibly; competitors cannot copy this without admitting their data is unverified.

---

## 6. Competitive edge summary

| Them (99acres/MagicBricks/Housing/NoBroker) | SocietyFlats |
|---|---|
| Listing-first, duplicate/fake-prone | **Society-first**, one canonical verified profile |
| Broker spam after one enquiry | Number shared only on matched verified enquiry |
| No data provenance | **% verified confidence + sources on every page** |
| Ad-cluttered, dense mobile UX | Premium calm app-shell, 5-tab native feel |
| Static FAQ/chatbots | **AI Advisor grounded in verified platform data** |
| Fake urgency mechanics | Honest zero-states, "we say so instead of guessing" |

The design's job is to make this table *felt* within 10 seconds of opening the site on a phone.

---

## 7. Implementation phasing (referenced by roadmap)

- **D1 — App shell**: MobileTabBar component, top-bar pattern, bottom-sheet primitive, PWA manifest polish. (No feature changes; pure chrome.)
- **D2 — Search + Society page** to spec (sticky action bar, gallery, facts grid, map-pill pattern).
- **D3 — Home + Compare + AI Advisor** to spec.
- **D4 — Dashboards + wizard polish + Referral/NRI screens.**
- **D5 — JSON-LD structured data + CWV pass + rewrite audit.**

Each phase ships as its own validated, tagged release per existing discipline.
