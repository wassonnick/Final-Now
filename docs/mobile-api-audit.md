# SocietyFlats Mobile API Audit

## Verified reusable public endpoints

From `backend/routes/api.php`, these can support mobile app foundations:

- `GET /api/health`
- `GET /api/societies`
- `GET /api/societies/lookup`
- `GET /api/societies/{slug}`
- `GET /api/societies/{slug}/intelligence`
- `GET /api/societies/{slug}/sources`
- `GET /api/properties`
- `GET /api/properties/{idOrSlug}`
- `GET /api/compare-pages`
- `GET /api/compare-pages/{slug}`
- `GET /api/compare/intelligence`
- `POST /api/leads`
- `POST /api/nri-cases`
- `POST /api/ai/advisor`
- `POST /api/ai/chat`
- `GET /api/ai/chat/{token}`
- `POST /api/ai/recommendations`
- `GET /api/ai/rent-estimate`
- `GET /api/societies/{idOrSlug}/reviews`
- `GET /api/societies/{idOrSlug}/rent-history`
- `GET /api/rent-intelligence/trends`
- `POST /api/reviews`
- `POST /api/listings`
- `POST /api/listings/images`

## Existing customer auth endpoints

Under bearer-authenticated account routes:

- `POST /api/account/upsert`
- `POST /api/account/request-otp`
- `POST /api/account/verify-otp`
- `GET /api/account/me`
- `GET /api/account/dashboard`
- `GET /api/account/listings`
- `GET /api/account/referrals`
- `POST /api/account/referrals`
- `GET /api/account/saved-search-alerts`

The mobile foundation prepares OTP routes but does not invent endpoints.

## Endpoints connected in SF-APP-1

- Societies list/detail
- Properties list/detail
- Search foundation through parallel societies/properties calls
- AI Advisor
- Leads callback placeholder service
- OTP request/verify architecture
- Account `/me` restoration

## Missing or future mobile-specific endpoints

- Saved societies/properties CRUD
- Saved searches CRUD and alert preferences
- Mobile-friendly home feed endpoint combining featured societies, listings and sectors
- Mobile notification registration endpoint
- Refresh-token endpoint
- Device session management
- Mobile profile preferences endpoint
- Compare shortlist endpoint
- Full owner listing draft lifecycle with upload progress and media moderation status

## Security assumptions

- Admin-only endpoints are not used in the mobile app.
- Tokens are stored in SecureStore and never logged.
- API logs include only method and URL in development.
- User-generated messages and PII are not passed to analytics.

