# SocietyFlats Codex Project Context

## Project Overview
SocietyFlats is a Gurgaon-first verified society rental marketplace.

It is not a generic real estate portal. It is society-first, search-first, verified-inventory-first.

Initial focus:
- Gurgaon rentals
- Later resale and builder floors
- Bangalore later

## Core Positioning
SocietyFlats helps users find verified flats inside Gurgaon societies with better trust, cleaner discovery, and society-level intelligence.

The platform should feel:
- Apple-level clean
- Airbnb Luxe simple
- Premium but trustworthy
- Society-first
- Search-first
- Image-led
- Minimal text
- Mobile-friendly
- Conversion-focused

## Design Direction
Use:
- White / warm white background
- Soft blue accents
- Deep navy text
- Platinum grey surfaces
- Subtle premium shadows
- Premium whitespace
- Clean rounded search bar
- Real Gurgaon/society imagery where possible

Avoid:
- Heavy text blocks
- Overly dark layouts
- Random gradients
- Cluttered filters
- Generic real estate portal feel
- Random redesigns without instruction

## Current Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide icons
- GSAP where needed

### Backend
- Laravel API
- PostgreSQL database
- Render deployment

### Current Deployment URLs
Frontend:
https://final-now-1.onrender.com

Backend API:
https://final-now.onrender.com/api

## Current Built Features
- Public homepage
- Public societies listing page
- Public society detail page
- Public properties listing page
- Public property detail page
- Public lead/enquiry form
- Admin login
- Admin dashboard
- Admin society CRUD
- Admin property CRUD
- Backend society API
- Backend property API
- Backend lead API
- Admin stats API
- Image upload endpoint
- Society URL fetch/import workflow
- Society brochure/PDF extraction workflow
- Society enrichment endpoint
- Society image approval/safety logic
- Basic compare page UI
- AI Advisor page UI
- Insights page UI
- Maps Intelligence page UI
- Broker CRM page UI
- Chat/Callback page UI
- Recommendations page UI
- Sell/Owner listing page UI

## Important Backend API Routes
Public:
- GET /api/health
- GET /api/societies
- GET /api/societies/{slug}
- GET /api/properties
- GET /api/properties/{idOrSlug}
- POST /api/leads

Admin:
- GET /api/admin/stats
- GET /api/admin/societies
- POST /api/admin/societies
- GET /api/admin/societies/{society}
- PUT /api/admin/societies/{society}
- DELETE /api/admin/societies/{society}
- POST /api/admin/societies/fetch-from-url
- POST /api/admin/societies/fetch-from-brochure
- POST /api/admin/societies/create-from-fetched-data
- POST /api/admin/societies/{society}/enrich
- GET /api/admin/properties
- POST /api/admin/properties
- GET /api/admin/properties/{property}
- PUT /api/admin/properties/{property}
- DELETE /api/admin/properties/{property}
- GET /api/admin/leads
- PUT /api/admin/leads/{lead}
- DELETE /api/admin/leads/{lead}
- POST /api/admin/uploads/images

## Hard Rules for Codex
- Do not restart the project from scratch.
- Do not rewrite the whole project.
- Do not redesign randomly.
- Do not scan the whole repo unless specifically asked.
- Do not touch backend unless the task requires it.
- Do not touch routing unless the task requires it.
- Do not remove working admin society CRUD.
- Do not remove working admin property CRUD.
- Do not break public society/property APIs.
- Do not remove existing lead capture.
- Do not change deployment config unless specifically asked.
- Always make the smallest possible patch.
- Always list files before editing.
- Always explain what will not be touched.
- Always keep rollback simple.
- Always run build/test commands when relevant.

## Current Main Gaps
- Admin Leads frontend still needs to be fully wired to backend instead of localStorage.
- Mobile homepage/hero needs stronger polish.
- Society detail page needs to become the flagship society-intelligence page.
- Sell/Owner listing page needs backend wiring.
- AI Advisor has UI but no real backend/recommendation engine.
- Compare page needs real add-to-compare workflow and persistence.
- Insights page uses static/demo data.
- Maps/Broker CRM/Chat/Recommendations are partial shells.
- Review moderation and user management are not complete.
- SEO landing pages are not built properly yet.

## Priority Order
1. Fix frontend dependency/build issue.
2. Fix Admin Leads to use backend instead of localStorage.
3. Polish mobile homepage hero.
4. Redesign Society Detail Page as the flagship page.
5. Wire Sell/Owner listing form to backend.
6. Add WhatsApp/callback/visit workflow.
7. Add AI Advisor backend.
8. Add advanced search and SEO landing pages.
9. Add partner/referral program.

## Working Style for Every Codex Task
Before editing, Codex must reply with:
1. Files it will inspect.
2. Files it will edit.
3. What it will not touch.
4. Rollback plan.

After editing, Codex must reply with:
1. Exact files changed.
2. What changed.
3. Build/test result.
4. How to rollback.
5. Recommended next step.
