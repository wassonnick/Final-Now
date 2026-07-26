# Email Flow and Resend Stabilization

Date: 2026-07-27

## Scope

This release makes email a non-blocking side effect of public submissions. A lead, owner listing, NRI case, or referral is persisted first and returns its normal success response even if Resend, a notification webhook, or delivery tracking is unavailable.

## Public submission coverage

- Lead and callback forms: admin alert plus requester confirmation when an email is supplied.
- Owner listing form: admin alert; any notification failure cannot turn a saved listing into a false HTTP error.
- NRI ownership request: admin alert plus requester confirmation when an email is supplied.
- Authenticated referral: admin alert plus referrer confirmation when the account has an email.

## Delivery safety

- Resend remains the outbound provider.
- Provider failures are caught and do not change a successful submission response.
- Reply-To uses the requester email for lead alerts when valid; otherwise it uses `SOCIETYFLATS_REPLY_TO_EMAIL` or the configured admin address.
- Email HTML uses the SocietyFlats navy/cream identity and links to the trust and privacy pages.
- Logs never include API keys or full recipient addresses.
- The delivery table stores only masked recipients, provider result metadata, related record ID, and a sanitized failure code. It does not store message bodies.
- The admin-only **Email Delivery** page shows sent, failed, and skipped attempts.

## Inbound email decision

Inbound email ingestion is intentionally disabled. Resend replies are routed using Reply-To, but email replies are not converted into CRM records. This avoids silently creating unreviewed leads or storing inbound message content. A signed webhook and explicit retention policy should be designed before inbound processing is introduced.

## Deployment

The database migration creates `email_deliveries`. Production deployment must run:

```bash
php artisan migrate --force
```

Optional Render backend variable:

```text
SOCIETYFLATS_REPLY_TO_EMAIL=<verified monitored mailbox>
```

Existing `RESEND_API_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, and SocietyFlats admin recipient variables remain unchanged. Never commit their values.

## Validation

- API route list includes `GET /api/admin/email-deliveries` behind `admin.api`.
- Backend: 305 tests passed, 1,983 assertions.
- Frontend production build passed.
- SEO validation passed.
- Generated sitemap validation observed 200 public societies, one public property, and 158 published comparison pages; the generated file was not included in this scoped email release.

