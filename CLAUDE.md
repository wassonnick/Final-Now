# SocietyFlats Claude Instructions

## Project
SocietyFlats is a Gurgaon-first verified society rental marketplace.

It is society-first, search-first, and verified-inventory-first.

Initial focus:
- Gurgaon rentals
- Later resale and builder floors
- Bangalore later

## Design Direction

Intent:
- Apple-level clean
- Airbnb Luxe simplicity
- Premium but trustworthy
- Minimal text
- Strong mobile UI
- Premium whitespace
- Large clean search
- Society-first pages
- Image-led but not cluttered

### Design tokens (verified against the live site, 2026-08-16)

These are measured from https://final-now-1.onrender.com, not aspirational. The same
note lives at the top of `frontend/src/pages/HomePremium.tsx`; the two must agree.

| Token | Value |
|---|---|
| Canvas | `#FFFFFF`, secondary ground `#F5F5F7` |
| Ink | `#1D1D1F` |
| Secondary text | `#6E6E73`, tertiary `#86868B` |
| Line / border | `#E4E4E9` |
| Accent | `#0F7B63` (green) |
| Soft accent | `#ECF6F2` |
| Type | Hanken Grotesk / DM Sans — **sans throughout, headings included** |
| Heading weight | 500, tracking about `-0.02em` |
| Button | Pill (`rounded-full`), weight 600 |
| Card radius | ~20px, soft shadows |

**An earlier version of this file said "white / soft blue / navy". That is wrong and has
been wrong for some time — the palette moved to the Apple-neutral + green system above.
Do not reintroduce navy or blue as a brand colour.**

Older pages still carry the previous blue/serif classes. They are retrofitted at runtime
by the `.ncr-skin` class in `src/index.css`, which force-maps `blue-*` to the green accent
and headings to the sans stack. So a page whose source reads `bg-blue-700` may well render
correctly — check the rendered result before "fixing" the source, and prefer adding
`ncr-skin` to a legacy page over rewriting its classes.

Before styling any new page: read the token table above, then confirm it against a live
page (or `HomePremium.tsx`). If the live site and this file ever disagree, the live site
wins and this file gets corrected in the same change.

## Current Stack
Frontend:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide icons

Backend:
- Laravel API
- PostgreSQL
- Render deployment

Frontend live:
https://final-now-1.onrender.com

Backend API:
https://final-now.onrender.com/api

## Current Built Features
- Public homepage
- Public societies listing
- Public society detail page
- Public properties listing
- Public property detail page
- Public lead form
- Admin login
- Admin dashboard
- Admin society CRUD
- Admin property CRUD
- Backend society API
- Backend property API
- Backend lead API
- Image upload endpoint
- Society URL import
- Brochure/PDF extraction
- Society enrichment endpoint

## Partial Features
- Mobile homepage polish
- Admin leads frontend backend wiring
- Sell/owner listing form backend wiring
- AI Advisor backend
- Compare functionality
- Insights real data
- Maps real integration
- Review moderation
- Partner/referral program
- WhatsApp/callback/visit flow

## Hard Rules
- Do not rewrite the whole project.
- Do not redesign randomly.
- Do not touch backend unless task requires it.
- Do not touch routing unless task requires it.
- Do not remove working admin society CRUD.
- Do not remove working admin property CRUD.
- Do not break public property/society APIs.
- Always make the smallest possible patch.
- Before editing, list files you will inspect and edit.
- After editing, explain exactly what changed.
- Run build/tests if available.
- Keep rollback simple.

## Current Priority Order
1. Fix frontend dependency/build issue.
2. Fix Admin Leads to use backend instead of localStorage.
3. Polish mobile homepage hero.
4. Redesign Society Detail Page as flagship page.
5. Wire Sell/Owner listing to backend.
6. Add WhatsApp/callback/visit workflow.
7. Add AI Advisor backend.
8. Add SEO landing pages.
9. Add partner/referral program.

## Allowed Working Style
For each task:
1. Read this file first.
2. Read CHECKPOINT.md, FEATURE_STATUS.md, and NEXT_TASKS.md.
3. Inspect only relevant files.
4. Give a short plan.
5. Edit only allowed files.
6. Keep existing UI/functionality unless specifically asked.
7. Commit-ready output only.
