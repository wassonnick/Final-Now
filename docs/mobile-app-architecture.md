# SocietyFlats Mobile App Architecture

## Current web/backend architecture audited

SocietyFlats currently runs as:

- Web frontend: React 19 + TypeScript + Vite + Tailwind in `frontend/`
- Backend: Laravel API in `backend/`
- Production frontend: `https://www.societyflats.com`
- Production API: `https://final-now.onrender.com/api`
- Auth: customer OTP endpoints under `/api/account/*`; admin APIs use bearer admin token and are not used by the mobile app foundation.

The mobile app is intentionally separate in `mobile/` and does not modify web routing or backend behavior.

## Mobile stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript strict mode
- Expo Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Expo SecureStore
- Axios
- Expo Image
- Expo Linking
- Expo Constants

## Navigation

Expo Router provides file-based navigation:

- `app/(tabs)/_layout.tsx` defines five bottom tabs.
- `app/(tabs)/index.tsx` is Home.
- `app/(tabs)/explore.tsx` is Explore.
- `app/(tabs)/saved.tsx` is Saved.
- `app/(tabs)/advisor.tsx` is Advisor.
- `app/(tabs)/account.tsx` is Account.
- Dynamic detail routes live at `app/societies/[slug].tsx` and `app/properties/[slug].tsx`.

Placeholder routes are polished and intentionally non-broken so app navigation can be expanded safely in SF-APP-2.

## State management

Server state uses TanStack Query with short stale times and one retry. Client state uses Zustand:

- `authStore`: token restoration, logged-in/logged-out state, 401 sign-out, logout.
- `onboardingStore`: persistent onboarding completion state through a small SecureStore-backed storage facade.

## API layer

`src/api/client.ts` centralizes:

- Base URL from `EXPO_PUBLIC_API_BASE_URL` or Expo `extra.apiBaseUrl`
- 15-second timeout
- Bearer token injection from SecureStore
- Laravel validation error extraction
- Network timeout handling
- 401 handling
- Development logging without tokens

Services are typed and grouped:

- `societyService`
- `propertyService`
- `searchService`
- `leadService`
- `authService`
- `advisorService`
- `savedItemsService`
- `userProfileService`

## Design system

The app uses a central token system in `src/theme/tokens.ts`:

- Warm paper background
- Deep pine primary
- Clay accent
- Serif-style headings
- System UI body typography as a Hanken Grotesk-ready placeholder
- Spacing, radii, shadows, icon sizing and component states

Fonts should be finalized in a later phase with packaged font files once licensing/source is confirmed.

## Deep links

Prepared route shapes:

- `societyflats://societies/:slug`
- `societyflats://properties/:slug`
- `societyflats://compare`
- `societyflats://advisor`
- `societyflats://list-property`

Future universal/app link setup:

- iOS: add Associated Domains entitlement for `applinks:www.societyflats.com`.
- Android: add intent filters and host Digital Asset Links at `https://www.societyflats.com/.well-known/assetlinks.json`.
- Web/backend should preserve canonical URL parity with app routes.

## Analytics

`src/lib/analytics.ts` provides a privacy-safe abstraction and currently logs only safe development events. It scrubs keys containing phone, email, token, password, message and name.

Events:

- `app_open`
- `onboarding_complete`
- `search_started`
- `society_viewed`
- `property_viewed`
- `society_saved`
- `property_saved`
- `callback_requested`
- `whatsapp_clicked`
- `advisor_started`
- `list_property_started`

No external trackers are installed in SF-APP-1.

