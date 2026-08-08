<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Product Feature Flags
    |--------------------------------------------------------------------------
    |
    | NCR multi-city routing and structured location UX stays disabled until the
    | review branch is approved. The schema/API foundation may exist safely while
    | public sitemap and indexable pages remain unchanged.
    |
    */
    'ncr_multicity' => env('NCR_MULTICITY_ENABLED', false),
    'ncr_city_indexing' => env('NCR_CITY_INDEXING_ENABLED', false),
    // The city the product already serves. It is live by definition and must never be
    // gated behind a launch approval — approvedSlugs() is empty whenever NCR indexing is
    // off, so gating on it alone would stop the entire Gurgaon pipeline.
    'home_city_slugs' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('HOME_CITY_SLUGS', 'gurgaon,gurugram'))
    ))),

    // Auto-publish refuses a society with no approved cover. A published society showing
    // a placeholder is the quality problem, not a lesser version of a good one.
    // Import/completion falls back to a pinned location map so the pipeline is never
    // blocked by a society nobody has photographed. Off means such societies stay drafts.
    'auto_publish_location_map' => (bool) env('AUTO_PUBLISH_LOCATION_MAP', true),

    'auto_publish_requires_image' => (bool) env('AUTO_PUBLISH_REQUIRES_IMAGE', true),

    'ncr_indexable_city_slugs' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('NCR_INDEXABLE_CITY_SLUGS', ''))
    ))),
];
