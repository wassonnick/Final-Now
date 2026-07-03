# C120 — Durable Search Console OAuth

## Baseline

- Starting branch: `main`
- Starting HEAD: `34484e55` (`C119C D3 polish: compare winner highlighting, AI grounding line`)
- Existing SEO Autopilot review, publication and sitemap safety controls remain unchanged.

## Change

Search Console imports now support durable OAuth refresh-token authentication.

- The backend exchanges the configured refresh token at Google's OAuth token endpoint.
- The newly issued access token is used only in memory for the Search Console request.
- Refresh-token credentials take precedence over a manually configured access token.
- Temporary `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` support remains for backwards compatibility.
- Dashboard responses expose only the authentication mode, never credential values.
- Refresh failures return a generic HTTP-status error and preserve existing metrics.

## Render variables

Configure these on the backend API. Configure the same values on a scheduler worker only if scheduled imports are enabled.

```text
GOOGLE_SEARCH_CONSOLE_SITE_URL=<exact Search Console property identifier>
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=<OAuth client ID>
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=<OAuth client secret>
GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=<OAuth refresh token>
```

Domain properties use a value such as `sc-domain:societyflats.com`. URL-prefix properties must use the exact Search Console property value. Do not add these credentials to the static frontend and do not commit them.

`GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` may be removed after refresh-token authentication is confirmed.

## Validation

- Refresh-token exchange and authenticated Search Console import are covered by the SEO Autopilot feature suite.
- The test verifies that a stale fallback access token is not used when refresh credentials are complete.
- Imported rows continue through the existing idempotent metric and opportunity pipeline.
- SEO Autopilot suite: 13 tests, 75 assertions, passed.
- Full backend suite: 111 tests, 845 assertions, passed.
- Frontend build and SEO validation: passed.
- Existing sitemap preserved with 43 society URLs during an API-unreachable build check.
- All 17 SEO Autopilot routes and scheduled commands remain registered.

## Release

- Commit: `Add durable Search Console OAuth refresh`
- Tag: `c120-search-console-refresh-auth`
