<?php

/*
|--------------------------------------------------------------------------
| Society Scoring Engine Configuration
|--------------------------------------------------------------------------
|
| Drives App\Services\Society\Import\SocietyScoringService. Every number a
| society receives is derived from measurable signals weighted here, so the
| result is explainable and admin-tunable. Builder/locality intelligence is
| config (not hardcoded), which keeps the engine city-agnostic (Gurgaon now,
| Bangalore later) — just add tiers for the new market.
|
| Matching is case-insensitive substring against the relevant text
| (builder name, or locality + sector + address for micro-markets).
|
*/

return [
    'version' => 1,

    // Final blended overall = weighted mean of the five category scores.
    'weights' => [
        'connectivity' => 0.22,
        'lifestyle' => 0.20,
        'security' => 0.18,
        'maintenance' => 0.20,
        'investment' => 0.20,
    ],

    // Realistic envelope — a real society is rarely a flat 10 or below ~5.5.
    'bounds' => ['min' => 5.5, 'max' => 9.6],

    // Neutral value used when a whole category has no usable signal.
    'neutral' => 7.0,

    // Max points shaved off the OVERALL score when data confidence is 0,
    // scaled linearly by (1 - confidence). Thin data cannot score deceptively high.
    'confidence_penalty' => 0.8,

    // Builder reputation tiers → resale strength, maintenance ops, security ops.
    'builder_tiers' => [
        'A' => [
            'score' => 9.2,
            'names' => ['dlf', 'emaar', 'm3m', 'godrej', 'tata', 'sobha', 'adani', 'central park', 'ireo', 'experion', 'mahindra', 'hines'],
        ],
        'B' => [
            'score' => 8.0,
            'names' => ['bestech', 'ats', 'vatika', 'bptp', 'ambience', 'aipl', 'puri', 'signature global', 'conscient', 'paras', 'whiteland', 'ss group', 'alpha corp', 'raheja', 'pioneer', 'unitech'],
        ],
        'C' => [
            'score' => 7.0,
            'names' => ['mapsko', 'ansal', 'rof', 'vipul', 'tulip', 'spaze', 'orris'],
        ],
        'default' => ['score' => 7.2],
    ],

    // Micro-market tiers. prestige → lifestyle/security baseline; growth →
    // investment upside; connectivity → arterial/expressway access proxy.
    'locality_tiers' => [
        'premium' => [
            'prestige' => 9.0, 'growth' => 7.8, 'connectivity' => 8.8,
            'names' => ['golf course road', 'dlf phase', 'cyber city', 'mg road', 'nirvana country'],
        ],
        'prime' => [
            'prestige' => 8.3, 'growth' => 8.2, 'connectivity' => 8.4,
            'names' => ['golf course extension', 'sohna road', 'spr', 'southern peripheral'],
        ],
        'growth' => [
            'prestige' => 7.6, 'growth' => 8.8, 'connectivity' => 7.6,
            'names' => ['dwarka expressway', 'new gurgaon', 'sector 79', 'sector 82', 'sector 83', 'sector 84', 'sector 85', 'sector 86', 'sector 89', 'sector 90', 'sector 92', 'sector 93', 'sector 102', 'sector 103', 'sector 104', 'sector 106', 'sector 108', 'sector 109', 'sector 110', 'sector 111', 'sector 112', 'sector 113', 'sector 37d', 'sector 36'],
        ],
        'value' => [
            'prestige' => 7.0, 'growth' => 7.4, 'connectivity' => 7.2,
            'names' => [],
        ],
        'default' => ['prestige' => 7.2, 'growth' => 7.4, 'connectivity' => 7.4],
    ],

    // Anchor for the airport leg of connectivity (haversine from society coords).
    'airport' => ['lat' => 28.5562, 'lng' => 77.1000, 'label' => 'IGI Airport'],

    // CONNECTIVITY: distance→score curves (metres). <= full_m ⇒ 10, >= zero_m ⇒ floor, linear between.
    'connectivity' => [
        'weights' => ['metro' => 0.32, 'office' => 0.28, 'airport' => 0.15, 'locality' => 0.25],
        'curves' => [
            'metro' => ['full_m' => 800, 'zero_m' => 6000, 'floor' => 3.0],
            'office' => ['full_m' => 1500, 'zero_m' => 12000, 'floor' => 3.0],
            'airport' => ['full_m' => 8000, 'zero_m' => 38000, 'floor' => 4.0],
        ],
    ],

    // Amenity classification (case-insensitive substring match against each amenity).
    'amenity_groups' => [
        'security' => ['24x7 security', 'cctv', 'gated', 'concierge', 'visitor parking', 'security'],
        'lifestyle_premium' => ['clubhouse', 'swimming pool', 'tennis court', 'basketball court', 'spa', 'concierge', 'landscaped greens', 'jogging track', 'badminton court'],
        'lifestyle_standard' => ['gym', 'kids play area', 'power backup', 'pet friendly', 'senior citizen area'],
    ],

    // LIFESTYLE: amenity richness + micro-market prestige + nearby lifestyle density.
    'lifestyle' => [
        'weights' => ['amenities' => 0.5, 'locality' => 0.3, 'nearby' => 0.2],
        'amenity_base' => 5.5,
        'premium_amenity_points' => 0.9,
        'standard_amenity_points' => 0.5,
        'amenity_cap' => 10.0,
        'nearby_full_count' => 8, // this many nearby lifestyle POIs ⇒ 10
    ],

    // SECURITY: on-site security amenities + builder ops + resident rating.
    'security' => [
        'weights' => ['amenities' => 0.5, 'builder' => 0.3, 'rating' => 0.2],
        'amenity_base' => 5.5,
        'amenity_point' => 0.9,
        'amenity_cap' => 10.0,
    ],

    // MAINTENANCE: builder/agency tier + project age + resident rating.
    'maintenance' => [
        'weights' => ['builder' => 0.5, 'age' => 0.25, 'rating' => 0.25],
        // <= new_years old ⇒ 10, >= old_years old ⇒ floor, linear between.
        'age_curve' => ['new_years' => 2, 'old_years' => 25, 'floor' => 6.5],
    ],

    // INVESTMENT: yield + micro-market growth + builder resale + connectivity + delivery status.
    'investment' => [
        'weights' => ['yield' => 0.28, 'growth' => 0.27, 'builder' => 0.2, 'connectivity' => 0.15, 'status' => 0.1],
        // rental yield %: <= low_pct ⇒ floor, >= high_pct ⇒ 10, linear between.
        'yield_curve' => ['low_pct' => 2.0, 'high_pct' => 5.0, 'floor' => 6.0],
        'status_scores' => [
            'ready to move' => 9.0, 'delivered' => 9.0, 'ready' => 9.0,
            'under construction' => 7.2, 'new launch' => 6.8,
            'default' => 7.5,
        ],
        // When market inputs (yield) are unconfirmed Gemini estimates, scale their weight by this.
        'unconfirmed_market_weight' => 0.5,
    ],

    // Resident rating (Google, 0–5) → 0–10 via ×2. Below this review count it is low-confidence.
    'rating' => ['min_reviews_for_confidence' => 20],
];
