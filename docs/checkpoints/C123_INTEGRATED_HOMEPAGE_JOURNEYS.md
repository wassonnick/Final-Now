# C123 — Integrated Homepage Journeys

## Starting point

- Branch: `main`
- Starting HEAD: `2934f458586bb6b26cd55dcbb0b4ad78743c2544`
- Previous release: `c122-premium-app-hub`

## Product correction

The standalone app-style `/explore` hub and homepage module launcher were removed after product review. They made the platform feel like a collection of separate widgets instead of one coherent property journey.

The homepage is search-first again. Existing modules now appear as contextual links and information strips at the point where each service becomes useful.

## What changed

- Restored the primary Explore navigation to society search.
- Removed the `/explore` route, metadata, rewrite and sitemap entry.
- Added a decision-support strip immediately after society discovery:
  - AI Advisor
  - Chat
  - Compare
  - Recommendations
- Added a property-tools strip immediately after live inventory:
  - Map Intelligence
  - Builder Floors
  - Investment Calculator
- Added an inline map-intelligence link to the main search/hero context and the locality section.
- Added a specialist-services band after the owner and broker journeys:
  - NRI Desk
  - Builder & RWA
  - Referral Partner
  - Broker Partner
- Expanded the footer so every major public journey remains discoverable without creating a competing app directory.

## Design intent

- Search and society discovery remain the primary journey.
- Decision tools appear after users have seen societies.
- Property tools appear beside inventory and location discovery.
- Specialist services appear after the core owner and broker actions.
- Desktop uses restrained horizontal information bands.
- Mobile converts the same bands into compact vertical link lists above the existing bottom navigation.

## Preserved behavior

- Existing society, property, AI, map, NRI, referral, builder/RWA and broker routes remain intact.
- Publication and review filters were not changed.
- No data, importer, admin, lead or SEO Autopilot behavior was modified.
- Sitemap failure protection and public-society retention remain enabled.

## Validation

- Desktop visual review completed at the homepage decision, property-tools and specialist-service placements.
- Mobile visual review completed at 390 × 844 for the homepage and decision-support placement.
- Production build: passed.
- SEO validation: passed.
- Backend tests: passed — 117 tests, 869 assertions.
- Failure-safe sitemap retained 43 public society URLs when the API was unavailable during generation.
