# SocietyFlats Mobile

Expo + React Native foundation for the SocietyFlats iOS and Android apps.

## Quick start

```bash
cd mobile
npm install
npm run start
```

Run on a simulator/emulator:

```bash
npm run ios
npm run android
```

## Environment

Copy `.env.example` to `.env` for local overrides.

```bash
EXPO_PUBLIC_API_BASE_URL=https://final-now.onrender.com/api
EXPO_PUBLIC_ENABLE_DEV_ANALYTICS=true
```

The production API URL is configured centrally in `src/config/env.ts`. Do not hardcode API URLs in screens or components.

## Architecture

- App framework: Expo SDK 54, React Native, TypeScript
- Navigation: Expo Router
- Server state: TanStack Query
- Client state: Zustand
- Forms: React Hook Form + Zod
- Secure auth storage: Expo SecureStore
- API client: Axios with timeout, token injection, Laravel validation error handling, 401 handling and safe development logging
- Design system: `src/theme/tokens.ts`
- Reusable UI: `src/components/index.tsx`

## Routes

Tabs:

- Home
- Explore
- Saved
- Advisor
- Account

Foundation routes:

- `/societies/:slug`
- `/properties/:slug`
- `/search`
- `/filters`
- `/compare`
- `/login`
- `/otp`
- `/list-property`
- `/notifications`

## Validation

```bash
npm run typecheck
npm run lint
npm run doctor
```

iOS/Android simulator validation should be reported only when actually run locally.

## Known limitations in SF-APP-1

- Several screens intentionally use polished placeholders.
- Saved items need backend endpoints before production use.
- Owner listing image UX is not implemented yet.
- Push notifications and universal/app links are documented but not configured in native store portals.
- Mock adapters live in `src/data/mockData.ts` and are isolated for removal.
