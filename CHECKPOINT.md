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
- Admin Leads frontend/backend wiring
- Mobile homepage polish
- Society detail page product polish
- Sell/Owner listing backend submission
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
1. Make frontend build pass cleanly.
2. Fix Admin Leads to use backend API.
3. Polish mobile homepage hero.
4. Redesign Society Detail Page.
5. Wire Sell/Owner Listing form.
6. Add WhatsApp/callback/visit workflow.
7. Add AI Advisor backend.
8. Add SEO landing pages.
9. Add partner/referral program.

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
