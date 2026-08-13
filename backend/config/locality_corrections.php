<?php

/**
 * Localities the importer files under the wrong city.
 *
 * The import defaults a missing city to Gurgaon, which is right for most of the catalogue
 * and wrong for every Delhi locality that arrives without one. No rule can tell that
 * "Tagore Garden Extension" is in Delhi — it is knowledge about places, so it lives here as
 * data a person can read and correct rather than inside a heuristic.
 *
 * Keyed by locality slug. Applied only by `societies:normalize-localities --fix-cities`,
 * which moves the locality and the societies linked to it together, because a society in
 * Gurgaon pointing at a Delhi locality is a worse state than either mistake alone.
 *
 * Every entry must name a city the catalogue actually carries. "Nuh" was listed here and is
 * a district of its own with no city row, so the move could only ever half-complete; the
 * command refuses such corrections now, and the entry is gone rather than sitting here
 * being refused forever.
 */
return [
    'dwarka' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'paschim-vihar' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'tagore-garden-extension' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'tagore-garden' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'rajouri-garden' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'janakpuri' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'punjabi-bagh' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'vikaspuri' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'uttam-nagar' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'rohini' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'pitampura' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'saket' => ['city' => 'Delhi', 'state' => 'Delhi'],
    'vasant-kunj' => ['city' => 'Delhi', 'state' => 'Delhi'],
];
