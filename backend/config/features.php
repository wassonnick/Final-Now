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
];
