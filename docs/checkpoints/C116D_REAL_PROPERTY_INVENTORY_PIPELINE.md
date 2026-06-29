# SocietyFlats — C116D Real Property Inventory Pipeline

Date: 2026-06-30  
Phase: C116D  
Branch: `main`  
HEAD before work: `b29ab43d7d2e45654d3b408c2f7fc3b0b763a562`

## Starting State

- C116E was complete, tagged `c116e-importer-review-hardening`, and synchronized with `origin/main`.
- Production had 40 public societies and zero public properties.
- Property drafts could already be created manually or from owner CRM leads.
- The frontend could attach a stock Unsplash image as a “SocietyFlats generic property image.”
- The backend accepted `status: Live` without server-side owner verification, a real photo, or publication audit timestamps.
- Public property consumers independently trusted `status: Live` plus a published parent society.
- Public property API responses would have exposed internal owner/source-lead fields once real inventory existed.

## C116D Changes

### Verified-live inventory contract

- Added one `Property::publiclyAvailable()` scope used by public property APIs, society property lists, AI recommendations, chat grounding, saved-search alerts, and admin live-inventory metrics.
- Public inventory now requires:
  - `status: Live`;
  - `verified: true`;
  - verification, availability-check, and publication timestamps;
  - a parent society that is published and `Verified` or `Premium`.
- Added nullable `verified_at`, `availability_checked_at`, and `published_at` columns through a reversible migration.

### Server-side publication gate

- Draft properties can still be saved with partial information and remain private.
- Publishing now requires a published verified society, verified owner/property details, an internal owner or authorised-broker name and valid phone, and at least one real property image.
- Rental publication still requires a security deposit.
- The former Unsplash stock placeholder is explicitly rejected by the backend.
- Successful publication records verification, current availability confirmation, publication time, and owner verification status.
- Moving a property out of `Live` clears its publication timestamp.

### Admin workflow

- Removed the generic stock-image action and all property stock-image fallbacks.
- Added internal owner/authorised-broker name and phone fields to both manual and owner-lead property drafts.
- The admin publish button now reflects the same society, owner contact, verification, and real-photo requirements enforced by the backend.
- Drafts without photos remain allowed; they cannot be published.

### Privacy

- Public property list/detail responses hide `source_lead_id`, owner name, owner phone, owner verification state, owner notes, and the source-lead relation.
- Authenticated admin property responses retain those fields for verification work.

## Current Data State

- Public societies: 40 (last verified production audit).
- Public properties: 0 (last verified production audit).
- No properties were imported, created, restored, published, modified, or deleted in production during C116D.
- No fake property cards or URLs were added.

## Validation

- Frontend production build: passed, including TypeScript and prerender generation.
- Focused property publication tests: passed; 4 tests and 33 assertions.
- Full backend suite: passed; 48 tests and 350 assertions.
- SEO validation: passed.
- API route inventory: passed; 94 routes.

## Known Remaining Risks

- The real inventory population itself still requires verified owner/broker submissions; C116D builds the safe pipeline but does not invent or import listings.
- Image authenticity is an operational verification responsibility; the backend blocks the known stock placeholder and requires a photo, but cannot prove photographic ownership automatically.
- The older, unused `Api\Admin\AdminPropertyController` does not match the active schema; current routes use `Api\PropertyController`.
- Existing properties created outside the active API need the three audit timestamps before they can become public. Production currently has zero properties.

## Recommended Next Phases

1. Populate the first verified property drafts from real owner/broker submissions.
2. C116B — referral MVP.
3. C116C — NRI MVP.

## Commit And Tag Recommendation

```bash
git add backend frontend/src/lib/publicData.ts frontend/src/pages/admin/AdminPropertiesPage.tsx frontend/src/pages/admin/AdminPropertyFormPage.tsx docs/checkpoints/C116D_REAL_PROPERTY_INVENTORY_PIPELINE.md
git commit -m "Build verified real property inventory pipeline"
git tag c116d-real-property-inventory-pipeline
```
