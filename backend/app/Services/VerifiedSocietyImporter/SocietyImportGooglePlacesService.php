<?php
namespace App\Services\VerifiedSocietyImporter;
class SocietyImportGooglePlacesService { public function available(): bool { return filled(config('services.google_places_api_key')); } public function enrich(array $input): array { return ['status'=>'placeholder','message'=>'Google enrichment is intentionally manual in the V2 foundation.','data'=>[]]; } }
