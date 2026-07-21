# SocietyFlats Mobile Release Checklist

## Before SF-APP-2

- Confirm Expo SDK 57 is the desired production SDK.
- Decide whether to keep Expo Go workflow or move to development builds.
- Finalize mobile font assets and licensing.
- Add real saved-item backend endpoints.
- Add refresh-token/session endpoint or document token expiry policy.
- Create mobile home-feed endpoint to reduce network calls.

## iOS prerequisites

- Apple Developer account.
- Bundle identifier: `com.societyflats.app`.
- App icons and splash assets.
- Privacy nutrition labels.
- Associated Domains for universal links.
- Push notification certificate/key if push is enabled.
- TestFlight internal testing.

## Android prerequisites

- Google Play Console account.
- Package name: `com.societyflats.app`.
- Adaptive icons and splash assets.
- Data Safety form.
- Digital Asset Links for app links.
- Internal testing track.

## API and operations

- Production API health confirmed.
- Rate limits reviewed for mobile traffic.
- Error monitoring selected.
- Privacy-safe analytics vendor selected, if any.
- Resend/email and lead notification flows verified for mobile sources.

## Store content

- App name: SocietyFlats.
- Subtitle/short description focused on society-first Gurgaon home search.
- Screenshots for Home, Explore, Society Detail, Advisor and Listing flow.
- Support URL, Privacy Policy URL and Terms URL.

## Known launch blockers

- No saved-item API yet.
- No push notification registration yet.
- No store-ready native assets yet.
- Mobile owner listing flow is only a route foundation in SF-APP-1.

