# SocietyFlats Next Development Tasks

## Task 1: Fix Frontend Dependency / Build Issue

### Goal
Make frontend build pass cleanly.

### Commands
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Rules
- Do not change app code unless the build reveals real code errors.
- If it is only a dependency issue, fix dependencies/package-lock only.
- Do not touch backend.
- Do not touch UI.
- Report exact commands run and final build result.

---

## Task 2: Fix Admin Leads Backend Wiring

### Goal
Admin Leads should load real backend leads instead of localStorage.

### Current Problem
Public lead forms post to:

```txt
POST /api/leads
```

But admin lead pages still use localStorage/adminLeadStore.

### Allowed Files
- frontend/src/pages/admin/AdminLeadsPage.tsx
- frontend/src/pages/admin/AdminLeadDetailPage.tsx
- frontend/src/lib/adminLeadStore.ts
- frontend/src/lib/api.ts only if required

### Expected Result
- Admin Leads list loads from:
```txt
GET /api/admin/leads
```

- Lead detail loads from backend.
- Lead update uses:
```txt
PUT /api/admin/leads/{lead}
```

- Lead delete uses:
```txt
DELETE /api/admin/leads/{lead}
```

### Do Not Touch
- Homepage
- Society CRUD
- Property CRUD
- Public pages
- Routing
- Backend unless absolutely required

### Build Requirement
After changes:

```bash
cd frontend
npm run build
```

---

## Task 3: Polish Mobile Homepage Hero

### Goal
Make mobile homepage look strong, premium, and presentable.

### Allowed Files
- frontend/src/pages/HomePage.tsx
- frontend/src/components/home/SocietyFlatsHero.tsx
- frontend/src/index.css

### Requirements
- Keep white/light blue premium direction.
- Use one strong search bar.
- Remove clutter from hero.
- Avoid BHK/filter tabs in hero.
- Hide desktop AI chat box on mobile.
- Keep floating chat icon on mobile.
- Improve spacing, font sizing, and CTA hierarchy.
- Do not make it dark or text-heavy.

### Do Not Touch
- Backend
- Admin pages
- Routing
- Property CRUD
- Society CRUD
- Lead APIs

---

## Task 4: Redesign Society Detail Page

### Goal
Make Society Detail Page the flagship society-intelligence page.

### Allowed File
- frontend/src/pages/SocietyPage.tsx

### Desired Sections
1. Society decision hero
2. Score cards
3. Rent/buy range
4. Live inventory
5. Amenities
6. Nearby schools
7. Nearby metro
8. Nearby hospitals
9. Nearby office hubs
10. Pros/cons
11. Verification/source box
12. Lead CTA

### Do Not Touch
- Admin CRUD
- Backend unless required
- Homepage
- Property pages

---

## Task 5: Wire Sell / Owner Listing Page

### Goal
Owner listing form should submit to backend lead system.

### Desired Flow
Owner fills:
- Society
- Tower
- BHK
- Expected rent/price
- Phone
- Purpose: rent/sell

Then system creates backend lead with:

```txt
source = owner_listing
```

### Expected Result
Lead appears in Admin Leads after Task 2 is complete.

---

## Task 6: Add WhatsApp / Callback / Visit Workflow

### Goal
Turn lead capture into operational workflow.

### Features
- WhatsApp CTA
- Request callback
- Schedule visit
- Lead status tracking
- Follow-up notes
- Next follow-up date

---

## Task 7: Add AI Advisor Backend

### Goal
Add backend endpoint for AI Advisor/recommendation.

### Suggested Endpoint
```txt
POST /api/ai/advisor
```

### Initial Approach
Start rule-based, not full AI.

Match based on:
- Budget
- BHK
- Locality
- Family/bachelor
- Pet-friendly
- Commute priority
- Society score
- Available inventory

---

## Task 8: Add SEO Landing Pages

### Goal
Create SEO-friendly pages for Gurgaon rental discovery.

### Pages To Build
- /rent/gurgaon
- /rent/golf-course-road
- /rent/sector-54
- /societies/gurgaon
- /societies/dlf
- /societies/m3m
- /societies/emaar

---

## Task 9: Add Partner / Referral Program

### Goal
Let common users become SocietyFlats partners and submit leads.

### Features
- Partner signup
- Lead submission form
- Lead tracking
- Commission status
- Partner dashboard
- Admin approval
- Payout tracking
