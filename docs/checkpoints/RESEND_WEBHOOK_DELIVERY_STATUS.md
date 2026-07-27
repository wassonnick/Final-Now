# Resend webhook delivery status

SocietyFlats now distinguishes an email accepted by Resend from one delivered to
the recipient mail server. The public webhook endpoint is:

`https://final-now.onrender.com/api/webhooks/resend`

Configure that endpoint in the Resend dashboard for these events:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.bounced`
- `email.complained`
- `email.failed`
- `email.suppressed`

Copy the webhook signing secret into the Render backend environment as
`RESEND_WEBHOOK_SECRET`. Never put that value in frontend variables or commit it.

The endpoint verifies the raw request signature, handles duplicate and
out-of-order events, and stores only the event type, timestamp, a one-way event
fingerprint, and a safe status/reason. It never stores webhook message bodies,
subjects, sender/recipient addresses, or raw provider diagnostics.

The admin Email Delivery page shows Accepted, Delivered, Delayed, Bounced,
Complained, Suppressed, Failed, and Skipped lifecycle states.
