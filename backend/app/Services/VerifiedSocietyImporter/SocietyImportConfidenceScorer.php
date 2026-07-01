<?php

namespace App\Services\VerifiedSocietyImporter;

class SocietyImportConfidenceScorer
{
    private const DEFAULTS = [
        'rera' => 98, 'hrera' => 98, 'dtcp' => 95, 'manual_admin' => 85,
        'builder_website' => 85, 'builder_brochure' => 85, 'google_places' => 88,
        'google_photos' => 80, 'google_places_nearby' => 85, 'excel' => 60, 'portal_reference' => 60, 'broker_input' => 60,
        'ai_extraction' => 45, 'internal_generator' => 65, 'importer_rule_engine' => 65,
    ];

    public function forSource(string $sourceType, mixed $explicit = null): int
    {
        if (is_numeric($explicit)) {
            return max(0, min(100, (int) $explicit));
        }
        return self::DEFAULTS[$sourceType] ?? 50;
    }

    public function priority(string $sourceType): int
    {
        return ['rera'=>1,'hrera'=>1,'dtcp'=>2,'builder_website'=>3,'builder_brochure'=>3,'google_places'=>4,'google_photos'=>4,'google_places_nearby'=>4,'manual_admin'=>5,'excel'=>5,'broker_input'=>6,'portal_reference'=>6,'internal_generator'=>7,'importer_rule_engine'=>7,'ai_extraction'=>8][$sourceType] ?? 9;
    }
}
