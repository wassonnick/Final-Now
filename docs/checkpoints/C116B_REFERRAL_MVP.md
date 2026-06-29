# SocietyFlats — C116B Referral MVP

Date: 2026-06-30  
Phase: C116B  
Branch: `main`  
HEAD before work: `f6e47bf0b8eec90139e2b7d741bb5e2ae480d325`

## What Changed

- Added OTP-account-token-protected referral list and submission APIs.
- Added a stable referral code per account and duplicate-safe referral records.
- Blocked self-referrals, invalid phones, repeated submissions, and phones that already have SocietyFlats accounts.
- Customer responses mask referred phone numbers and never expose admin notes.
- Added a private, noindex `/referrals` customer page linked from the customer dashboard.
- Added an authenticated `/admin/referrals` review queue and admin navigation entry.
- Admins alone control submitted, contacted, qualified, rejected, converted, and reward states.
- Reward approval/payment is rejected until a referral is explicitly marked converted.
- Copy clearly states that submission does not guarantee a reward; no payout amount or automatic payout is promised.

## Data And Privacy

- Referral contacts are private and available only to the referring authenticated account in masked form and to authenticated admins in full.
- No referrals, rewards, leads, properties, or accounts were created in production during this phase.
- Current production data remains 40 public societies and zero public properties based on the last live audit.

## Validation

- Referral flow tests: passed; 4 tests and 20 assertions.
- Full backend suite: passed; 52 tests and 370 assertions.
- Frontend production build: passed, including TypeScript and prerender generation.
- SEO validation: passed.
- API route inventory: passed; 98 routes.

## Known Remaining Risks

- The MVP records introductions but does not send invitation SMS/WhatsApp messages.
- Consent to share the referred contact remains an operational/user attestation; no separate consent receipt is collected from the referred person yet.
- Reward amounts and payment rails are intentionally absent until commercial terms and compliance are defined.
- A public referral-code landing/conversion attribution flow is not included in this private-account MVP.

## Next Recommended Phase

1. C116C — NRI MVP.
2. Referral messaging/consent and verified conversion attribution after policy approval.

## Commit And Tag Recommendation

```bash
git add backend frontend docs/checkpoints/C116B_REFERRAL_MVP.md
git commit -m "Add private referral review MVP"
git tag c116b-referral-mvp
```
