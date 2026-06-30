# SocietyFlats — C113 Fix 1 Verified Importer Profile Application

Date: 2026-06-30
Branch: `main`
HEAD before work: `77937a25`

## Outcome

Verified Society Importer V2 now applies safe, source-tracked values to the real `societies` profile while retaining the review records. Imported societies remain `Draft`, `Needs Review`, unpublished and absent from public inventory.

## Fixes

- Added `SocietyImportProfileApplier` as the shared mapping layer for initial draft creation, individual field approval and high-confidence bulk application.
- Mapped importer names to the actual society schema, including builder, location, place ID, coordinates, official URLs, nearby intelligence, ranges, scores and image reference URL.
- Expanded CSV aliases for locality, possession date, developer/project URLs, office hubs, image references, Google photo references and score fields.
- Single import now accepts location, map, coordinate and image-reference inputs in the admin page.
- Bulk text continues to map `name | sector | builder` and comma-delimited equivalents into real profile fields.
- Cover, gallery, reference and Google photo inputs create unapproved review candidates. Unsafe local/private image URLs fail the row before society creation.
- New drafts use score `7.0` as a visible review placeholder; its source record is `Importer safe draft default` with low confidence and still needs review.
- Builder/project input now appears in `official_project_url`, matching the admin form profile checklist. Explicit `developer_url` maps to `official_developer_url`.
- Import summaries now show fields applied, pending fields, pending images, duplicate status and an **Open Society Draft** link.
- Field approval applies the approved value through the same mapping layer.
- Added an admin-only **Apply all high-confidence fields** action for V2 importer drafts at confidence 80 or above.

## Safety

- No publish endpoint or automatic publication was added.
- High-confidence bulk apply is restricted to societies created by Verified Society Importer V2.
- Imported image references never become approved covers automatically and do not overwrite an approved image.
- The legacy importer remains unchanged.
- The pre-existing `frontend/public/sitemap.xml` modification was preserved and is excluded from this fix.

## Validation

- Migration check: passed; nothing new to migrate.
- Focused V2 suite: 11 tests passed.
- Full backend suite: 65 tests passed.
- Frontend production build: passed.
- SEO validation: passed.
- Sitemap file hash remained unchanged during the build.

## Release

```bash
git commit -m "Fix verified society importer field application"
git tag c113-fix1-verified-importer-applies-fields
```
