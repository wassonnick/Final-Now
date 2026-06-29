# SocietyFlats — C116C NRI MVP

Date: 2026-06-30  
Phase: C116C  
Branch: `main`  
HEAD before work: `60bb72c9fb70db2aa3aa77045b848fd1d6065af8`

## What Changed

- Added a public, throttled NRI consultation intake supporting international email or WhatsApp contact.
- Added service categories for buying, selling, renting out and local property-management coordination.
- Added mandatory contact consent and preferred-contact validation.
- Added a private admin NRI case queue with status, assignment, follow-up and internal-note fields.
- Added `/nri-services` and `/nri` routes, navigation, route-specific SEO metadata, prerender output and sitemap inclusion.
- Added clear scope copy: no legal, tax, FEMA, banking, remittance, timeline, rent, resale-value or investment-return guarantees.
- The intake explicitly tells users not to submit passport, PAN, bank, payment or remittance details.
- Public submission responses return only a case reference and disclaimer; private contact/case data is available only through authenticated admin routes.

## Data State

- No NRI cases, leads, accounts, properties or documents were created in production.
- Production remains at 40 public societies and zero public properties based on the last live audit.
- Sitemap now has 82 URLs, including 40 society URLs, zero property URLs and the NRI services route.

## Validation

- Focused NRI tests: passed; 2 tests and 12 assertions.
- Full backend suite: passed; 54 tests and 382 assertions.
- Frontend production build: passed, including TypeScript and 35 prerendered routes.
- SEO validation: passed across 16 static HTML routes and public assets.
- API route inventory: passed; 101 routes.

## Known Remaining Risks

- The MVP does not upload or manage identity/property/legal documents; a separate encrypted document workflow and retention policy would be required before adding that capability.
- SocietyFlats does not provide regulated legal, tax, FEMA, banking or remittance advice. Specialist referrals and disclaimers need policy/legal approval before expansion.
- No timezone-aware appointment scheduler or international messaging delivery is included yet.
- Case submission is public and throttled but does not yet use CAPTCHA or email/WhatsApp verification.

## Next Recommended Work

1. Deploy migrations and smoke-test C116D/B/C routes in production.
2. Populate only verified real property drafts from consented owner/broker submissions.
3. Define referral commercial terms and NRI specialist/retention policies before expanding either MVP.

## Commit And Tag Recommendation

```bash
git add backend frontend docs/checkpoints/C116C_NRI_MVP.md
git commit -m "Add private NRI consultation MVP"
git tag c116c-nri-mvp
```
