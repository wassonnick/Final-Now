# SocietyFlats Checkpoint

## Current Freeze Point
This checkpoint records the current working direction and should be read before every Codex task.

## Current Status
The project has moved beyond prototype stage.

It currently contains:
- React frontend
- Laravel backend API
- Public society/property pages
- Admin society CRUD
- Admin property CRUD
- Public lead capture
- Society auto-import/enrichment workflows
- Several partial feature pages

## Most Reliable Working Modules
- Public societies listing
- Public society detail
- Public properties listing
- Public property detail
- Property enquiry form
- Backend society API
- Backend property API
- Backend lead API
- Admin society CRUD
- Admin property CRUD
- Admin stats API
- Image upload endpoint
- Society URL fetch/import
- Brochure/PDF society extraction

## Known Partial Modules
- AI Advisor backend
- Compare page workflow
- Market Insights real data
- Maps Intelligence real map data
- Broker CRM workflow
- Chat/Callback workflow
- Recommendations engine
- Review moderation
- Admin users/settings/analytics

## Current Immediate Development Order
Done: frontend build clean, Admin Leads backend wiring, mobile homepage polish,
Society Detail Page redesign, Sell/Owner Listing backend wiring, site-visit
scheduling workflow (admin proposes slots, public /visit/:token confirms,
lead status syncs, generic webhook hook for WhatsApp/notification delivery
exists but is unconfigured pending a provider choice). AI Advisor backend
500 bug fixed and confirmed working live. All verified against production
API on 2026-06-24.

1. Add SEO landing pages.
2. Add partner/referral program.

## Files/Areas Not To Touch Unless Specifically Asked
- Backend routing
- Admin society CRUD
- Admin property CRUD
- Public society/property APIs
- Render deployment config
- Authentication/session logic
- Existing working public pages
- Existing database migrations

## Before Any Change
Run:

```bash
git status
git add .
git commit -m "checkpoint before new codex task"
```

Optional branch:

```bash
git checkout -b codex-task-name
```

## After Successful Change
Run:

```bash
git status
git add .
git commit -m "describe successful change"
```

## Rollback Commands
Rollback last commit:

```bash
git reset --hard HEAD~1
```

Return to main branch:

```bash
git checkout main
```

Delete failed task branch:

```bash
git branch -D codex-task-name
```

## Build Commands

Frontend:

```bash
cd frontend
npm install
npm run build
```

Backend route check:

```bash
cd backend
php artisan route:list --path=api
```

## Current Rule
Do not ask Codex to “fix everything.”

Use one task per chat and one branch per task.
