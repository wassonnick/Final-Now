# C122 — Premium Desktop + Mobile App Hub

## Baseline

- Starting branch: `main`
- Starting HEAD: `8cfb005e` (`C121 automation wave 2: real queue, market suggestions, photo checks, AI budget guard`)
- Existing search, society, property, AI, account, partner, importer and admin behavior was preserved.

## Product outcome

SocietyFlats now has a unified public product front door at `/explore`. The page presents the platform as one connected journey instead of a collection of isolated modules.

The hub includes:

- a premium SocietyFlats AI-led hero;
- four intent-based starting journeys: find, decide, ask and partner;
- AI Advisor, chat, recommendations, maps, compare and insights;
- verified societies, rent, buy, sell, builder floors and investment calculator;
- NRI services, Builder & RWA, referral partner and broker partner journeys;
- explicit safety language around verified data and fabricated inventory;
- desktop card architecture and a compact two-column mobile app grid;
- responsive app-style bottom navigation with Explore pointing to the new hub.

## Discovery changes

- Desktop navigation `Explore` now opens `/explore`.
- Mobile bottom navigation `Explore` now opens `/explore`.
- The mobile menu includes `All Services`.
- The homepage includes a compact eight-module app launcher and an `Open all services` CTA.
- All links route to existing modules; protected referral/account routes retain their authentication gates.

## SEO and deployment

- `/explore` has route-specific title, description, canonical URL and CollectionPage schema.
- Static prerender metadata now generates `explore/index.html`.
- Render rewrites `/explore` to the prerendered page.
- `/explore` is included in the failure-safe sitemap without changing any society or property URLs.

## Validation

- Frontend TypeScript/Vite build: passed.
- SEO validation: passed.
- Backend regression suite: 117 tests, 869 assertions, passed.
- Sitemap retained 43 society URLs and includes `/explore`.
- Desktop browser QA: 1280px viewport, hero contrast and hierarchy verified.
- Mobile browser QA: 390 × 844 viewport, no horizontal overflow, app navigation and two-column cards verified.

## Visual safety fix

Responsive QA identified a specificity collision between the public heading bridge and the dark hero. The hero H1 and final dark CTA heading now explicitly retain white contrast.

## Suggested follow-up

- Add first-party analytics events for module-card opens and journey selection.
- Personalize the intent panel after account sign-in using saved searches and shortlist state.
- Consider a lightweight onboarding prompt for first-time visitors after real usage data is available.

## Release

- Commit: `Launch premium SocietyFlats app hub`
- Tag: `c122-premium-app-hub`
