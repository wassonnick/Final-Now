# SocietyFlats — C116E Importer Review Hardening

Date: 2026-06-30  
Phase: C116E  
Branch: `main`  
HEAD before work: `e01d941558b25d676b64e23f58fe137eac7d3156`

## Starting State

- C116A was complete, tagged `c116a-api-seo-sitemap-stable`, and synchronized with `origin/main`.
- Importer pipeline and structured-import flows could automatically approve Google Places images.
- Structured rows could retain incoming `Verified` status text even though they were unpublished.
- The importer publish endpoint checked score and location but did not require an explicit completed-review state.
- The review UI's `Save Draft` action silently meant `Mark reviewed`, and Publish remained available before review.

## C116E Changes

### Explicit image review

- Google Places and official-source image candidates now remain unapproved, without a cover selection or rights confirmation, after all import paths.
- Structured imports no longer assign an image photo reference as a selected cover.
- Candidate approval still requires the existing explicit admin rights-and-attribution confirmation.
- Approving, rejecting, or changing an image candidate resets `verification_status` to `Needs Review`.

### Explicit content review and publish gate

- Every structured import is forced to `Draft`, `Needs Review`, unpublished, and without an approved image, regardless of incoming row status fields.
- The importer publish endpoint now rejects drafts unless `verification_status` is exactly `Reviewed` (case-insensitive).
- Score and sector/locality requirements remain in force after the review gate.
- Successful publish continues to set `Verified`, publish the society, and preserve the original publication timestamp behavior.
- Re-enrichment already returned content to `Needs Review`; market-data refresh now does the same.
- Editing an imported, unpublished draft after review also resets it to `Needs Review`; the status-only `Mark reviewed` request remains explicit and valid.

### Importer UI clarity

- The review state is visible beside each opened draft.
- `Save Draft` was replaced by an explicit `Mark reviewed` action.
- Publish is disabled until review is complete, with the same requirement enforced by the backend.
- Provider-neutral AI wording now covers Gemini or Claude without changing field-level provenance labels.

## Safety Preserved

- Imports still create drafts and never create public inventory automatically.
- Images remain optional at publish time, but an unapproved image can never display publicly.
- Public society/property filters, admin authentication, importer queueing, AI fallbacks, and lead flows were not weakened.
- No societies or properties were imported, restored, published, or deleted during C116E.
- No environment values or secrets were read or printed.

## Current Data State

- Public societies: 40 (last verified production audit).
- Public properties: 0 (last verified production audit).
- No production data mutation was performed in this phase.

## Validation

- PHP syntax checks: passed for all changed backend classes.
- Focused importer/safety tests: passed; 15 tests and 125 assertions.
- Frontend production build: passed, including TypeScript and prerender generation.
- SEO validation: passed.
- API route inventory: passed; 94 routes.
- Full backend suite: passed; 44 tests and 317 assertions.

## Known Remaining Risks

- Generic admin society CRUD still permits direct publication-field updates; C116E hardens the importer workflow specifically and does not redesign legacy admin permissions.
- Review completion is represented by the existing string field rather than a reviewer identity/timestamp audit record.
- Historical records that were auto-approved before C116E are not changed automatically.
- Real verified property inventory remains empty.
- AI/provider-specific internal diagnostic wording remains in provider implementation code where it accurately identifies the failing service.

## Recommended Next Phases

1. C116D — real property inventory pipeline.
2. C116B — referral MVP.
3. C116C — NRI MVP.

## Commit And Tag Recommendation

```bash
git add backend frontend/src/pages/admin/AdminSocietyImportPage.tsx docs/checkpoints/C116E_IMPORTER_REVIEW_HARDENING.md
git commit -m "Harden importer review and publication gates"
git tag c116e-importer-review-hardening
```
