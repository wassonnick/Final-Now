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
    'ncr_indexable_city_slugs' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('NCR_INDEXABLE_CITY_SLUGS', ''))
    ))),
];
