<?php

namespace App\Services;

use App\Models\Society;
use App\Models\SocietyImportJob;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SocietyImportService
{
    public function __construct(private SocietyAiEnrichmentService $ai, private GooglePlacesSocietyImageService $places) {}

    public function processJobTick(SocietyImportJob $job): SocietyImportJob
    {
        $lock = Cache::lock('society-import-job-'.$job->id, 120);
        if (! $lock->get()) {
            return $job->refresh();
        }

        try {
            return $this->processJobTickUnlocked($job);
        } finally {
            $lock->release();
        }
    }

    private function processJobTickUnlocked(SocietyImportJob $job): SocietyImportJob
    {
        $job->refresh();

        if (in_array($job->status, ['completed', 'failed', 'skipped'], true)) {
            return $job;
        }

        if ($job->status === 'queued') {
            $job->update(['status' => 'running']);
            $this->log($job, 'Job started.');
            $job->refresh();
        }

        if ($job->type === 'by_name') {
            return $this->processSingleNameJob($job);
        }

        if ($job->type === 'by_url') {
            return $this->processSingleUrlJob($job);
        }

        if ($job->type === 'bulk_names') {
            return $this->processBulkNamesJob($job);
        }

        if ($job->type === 'bulk_spreadsheet') {
            return $this->processSpreadsheetJob($job);
        }

        if ($job->type === 'bulk_source') {
            return $this->processBulkSourceJob($job);
        }

        $this->log($job, 'Unknown import job type.');
        $job->update([
            'status' => 'failed',
            'failed_count' => 1,
            'completed_at' => now(),
        ]);

        return $job->refresh();
    }

    public function quickAddSuggestions(int $limit = 80): array
    {
        $existing = Society::query()
            ->pluck('name')
            ->map(fn ($name) => mb_strtolower(trim((string) $name)))
            ->all();

        $items = [];

        foreach ($this->knownGurgaonSocieties() as $item) {
            $name = $item['name'];
            if (in_array(mb_strtolower($name), $existing, true)) {
                continue;
            }

            $items[] = $item;

            if (count($items) >= $limit) {
                break;
            }
        }

        return $items;
    }

    private function processSingleNameJob(SocietyImportJob $job): SocietyImportJob
    {
        if (! empty($job->results)) {
            return $job;
        }

        $name = trim((string) $job->input);
        $result = $this->importSingleFromName($name, $job, $job->source ?: 'Name Import');

        $job->update([
            'status' => $this->statusForResult($result),
            'result_society_id' => $result['id'] ?? null,
            'imported_count' => ($result['status'] ?? '') === 'created' ? 1 : 0,
            'failed_count' => ($result['status'] ?? '') === 'failed' ? 1 : 0,
            'results' => [$result],
            'completed_at' => now(),
        ]);

        return $job->refresh();
    }

    private function processSingleUrlJob(SocietyImportJob $job): SocietyImportJob
    {
        if (! empty($job->results)) {
            return $job;
        }

        $url = trim((string) $job->input);
        $result = $this->importSingleFromUrl($url, $job);

        $job->update([
            'status' => $this->statusForResult($result),
            'result_society_id' => $result['id'] ?? null,
            'imported_count' => ($result['status'] ?? '') === 'created' ? 1 : 0,
            'failed_count' => ($result['status'] ?? '') === 'failed' ? 1 : 0,
            'results' => [$result],
            'completed_at' => now(),
        ]);

        return $job->refresh();
    }

    private function processBulkNamesJob(SocietyImportJob $job): SocietyImportJob
    {
        $results = $job->results ?: [];

        if (empty($results)) {
            $names = $this->decodeNamesInput($job->input);

            if (empty($names)) {
                $this->log($job, 'No valid society names found.');
                $job->update([
                    'status' => 'failed',
                    'failed_count' => 1,
                    'completed_at' => now(),
                ]);

                return $job->refresh();
            }

            $results = array_map(fn ($name) => [
                'name' => $name,
                'status' => 'pending',
            ], $names);

            $job->update(['results' => $results]);
            $this->log($job, 'Prepared '.count($results).' names for import. Polling will process one society per tick.');

            return $job->refresh();
        }

        return $this->processNextPendingResult($job, 'Name List Import');
    }

    private function processBulkSourceJob(SocietyImportJob $job): SocietyImportJob
    {
        $results = $job->results ?: [];

        if (empty($results)) {
            $payload = $this->decodePayload($job->input);
            $source = (string) ($payload['source'] ?? $job->source ?? 'MagicBricks');
            $locality = (string) ($payload['locality'] ?? 'Gurgaon');
            $limit = max(1, min(40, (int) ($payload['limit'] ?? 12)));
            $names = $this->bulkCandidateNames($source, $locality, $limit);

            if (empty($names)) {
                $this->log($job, "No candidates found for {$source} / {$locality}.");
                $job->update([
                    'status' => 'failed',
                    'failed_count' => 1,
                    'completed_at' => now(),
                ]);

                return $job->refresh();
            }

            $results = array_map(fn ($name) => [
                'name' => $name,
                'status' => 'pending',
            ], $names);

            $job->update([
                'source' => $this->sourceLabel($source),
                'results' => $results,
            ]);

            $this->log($job, 'Prepared '.count($results)." {$this->sourceLabel($source)} candidates for {$locality}. Polling will import one per tick.");

            return $job->refresh();
        }

        return $this->processNextPendingResult($job, $job->source ?: 'Bulk Source Import');
    }

    private function processSpreadsheetJob(SocietyImportJob $job): SocietyImportJob
    {
        $results = $job->results ?: [];
        if ($results === []) {
            $this->log($job, 'Spreadsheet contains no prepared rows.');
            $job->update(['status' => 'failed', 'failed_count' => 1, 'completed_at' => now()]);

            return $job->refresh();
        }

        return $this->processNextPendingResult($job, 'Gemini Spreadsheet Import');
    }

    private function processNextPendingResult(SocietyImportJob $job, string $source): SocietyImportJob
    {
        $results = $job->results ?: [];
        $nextIndex = null;

        foreach ($results as $index => $item) {
            if (($item['status'] ?? '') === 'pending') {
                $nextIndex = $index;
                break;
            }
        }

        if ($nextIndex === null) {
            return $this->completeBulkJob($job, $results);
        }

        $name = trim((string) ($results[$nextIndex]['name'] ?? ''));

        if ($name === '') {
            $results[$nextIndex] = [
                'name' => $name,
                'status' => 'failed',
                'message' => 'Empty name',
            ];
        } else {
            $seed = $job->type === 'bulk_spreadsheet' ? $results[$nextIndex] : [];
            $results[$nextIndex] = $this->importSingleFromName($name, $job, $source, $seed);
        }

        $job->update(['results' => $results]);

        return $this->completeBulkJob($job, $results);
    }

    private function completeBulkJob(SocietyImportJob $job, array $results): SocietyImportJob
    {
        $pending = collect($results)->contains(fn ($item) => ($item['status'] ?? '') === 'pending');

        $imported = collect($results)->where('status', 'created')->count();
        $failed = collect($results)->where('status', 'failed')->count();
        $skipped = collect($results)->where('status', 'skipped')->count();

        if ($pending) {
            $job->update([
                'imported_count' => $imported,
                'failed_count' => $failed,
            ]);

            return $job->refresh();
        }

        $status = $failed > 0 && $imported === 0 ? 'failed' : 'completed';

        $job->update([
            'status' => $status,
            'imported_count' => $imported,
            'failed_count' => $failed,
            'completed_at' => now(),
        ]);

        $this->log($job, "Import finished. Created {$imported}, skipped duplicates {$skipped}, failed {$failed}, total ".count($results).'.');

        return $job->refresh();
    }

    private function importSingleFromName(string $name, SocietyImportJob $job, string $source, array $seed = []): array
    {
        $name = trim($name);

        if (mb_strlen($name) < 3) {
            $this->log($job, "Failed: {$name} is too short.");

            return [
                'name' => $name,
                'status' => 'failed',
                'message' => 'Name too short',
            ];
        }

        $existing = $this->findExistingSociety($name);

        if ($existing) {
            $this->log($job, "Skipped duplicate: {$existing->name} already exists as ID {$existing->id}.");

            return [
                'name' => $existing->name,
                'status' => 'skipped',
                'id' => $existing->id,
                'edit_url' => "/admin/societies/{$existing->id}/edit",
                'message' => 'Duplicate skipped',
            ];
        }

        $this->log($job, 'AI provider: '.$this->ai->provider().' | available: '.($this->ai->isAvailable() ? 'yes' : 'no'));

        $context = $seed === [] ? '' : "Admin-provided spreadsheet identity fields (treat these as authoritative):\n".json_encode(array_intersect_key($seed, array_flip(['society_name', 'city', 'sector', 'locality', 'builder', 'google_maps_url'])), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $includeImages = (bool) ($seed['include_images'] ?? false);
        $aiData = $this->ai->enrichSociety($name, $context, $source, $includeImages);

        if (! empty($aiData['_ai_error']) && $this->ai->isAvailable()) {
            $message = ! empty($aiData['_ai_quota_limited'])
                ? 'AI quota/rate limit hit. Draft not created to avoid weak fallback data. Try again later or reduce bulk size.'
                : 'AI enrichment failed: '.$aiData['_ai_error'].'. Draft not created to avoid weak fallback data.';

            $this->log($job, $message);

            $job->update([
                'status' => 'failed',
                'failed_count' => (int) $job->failed_count + 1,
                'results' => array_merge($job->results ?? [], [[
                    'name' => $name,
                    'status' => 'failed',
                    'message' => $message,
                ]]),
                'completed_at' => now(),
            ]);

            return [
                'name' => $name,
                'status' => 'failed',
                'message' => $message,
            ];
        } elseif (! empty($aiData)) {
            $this->log($job, 'AI enrichment parsed. Mapping structured fields into draft.');
        } else {
            $this->log($job, 'AI enrichment unavailable. Using safe fallback fields.');
        }

        $draft = $this->draftDataByName($name, $source, $aiData);
        foreach (['city', 'sector', 'locality', 'builder', 'google_maps_url'] as $field) {
            if (isset($seed[$field]) && trim((string) $seed[$field]) !== '') {
                $draft[$field] = trim((string) $seed[$field]);
            }
        }
        $draft['name'] = $name;
        $draft['status'] = 'Draft';
        $draft['verification_status'] = 'Needs Review';
        $draft['is_published'] = false;
        $draft['published_at'] = null;
        $draft['featured'] = false;
        $draft['show_in_hero'] = false;
        $draft['search_boost'] = false;
        $draft['source_name'] = $source;
        $draft['image_approved_by_admin'] = false;
        if ($includeImages && ! empty($draft['image_url'])) {
            $draft['image_status'] = 'needs_review';
        }
        $draft['official_source_notes'] = trim(($draft['official_source_notes'] ?? '').' Imported from spreadsheet row '.($seed['row_number'] ?? 'unknown').'; all Gemini fields require admin review.');
        $society = Society::create($draft);

        if ($includeImages && trim((string) config('services.google_places_api_key')) !== '') {
            try {
                $reference = $this->places->findImageReference($society);
                $society->update([
                    'place_id' => $reference['place_id'] ?: $society->place_id,
                    'image_reference_url' => $reference['safe_reference_url'],
                    'image_status' => 'google_places_reference_found',
                    'image_approved_by_admin' => false,
                    'image_alt_text' => $society->image_alt_text ?: $society->name.' residential society in Gurugram',
                    'image_credit' => $reference['credit'],
                    'image_license_notes' => $reference['license_note'],
                ]);
                $this->log($job, "Google Places image reference found for {$society->name}; admin approval is still required.");
            } catch (\Throwable $exception) {
                $this->log($job, "No Google Places image reference saved for {$society->name}: {$exception->getMessage()}");
            }
        }

        $society->refresh();

        $this->log($job, "Draft created: {$society->name} (ID {$society->id}). Review before publishing.");

        return [
            'name' => $society->name,
            'status' => 'created',
            'id' => $society->id,
            'edit_url' => "/admin/societies/{$society->id}/edit",
            'message' => 'Draft created',
            'row_number' => $seed['row_number'] ?? null,
            'image_reference_url' => $society->image_reference_url,
            'image_url' => $society->image_url,
            'image_status' => $society->image_status,
            'image_credit' => $society->image_credit,
            'image_approved_by_admin' => (bool) $society->image_approved_by_admin,
        ];
    }

    private function importSingleFromUrl(string $url, SocietyImportJob $job): array
    {
        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            $this->log($job, 'Invalid URL.');

            return [
                'name' => $url,
                'status' => 'failed',
                'message' => 'Invalid URL',
            ];
        }

        $this->log($job, "Fetching URL: {$url}");

        $title = '';
        $description = '';
        $bodyText = '';

        try {
            $response = Http::timeout(12)
                ->withHeaders([
                    'User-Agent' => 'SocietyFlats Admin Importer/1.0',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                ])
                ->get($url);

            if ($response->successful()) {
                $html = (string) $response->body();
                $title = $this->extractTitle($html);
                $description = $this->extractMetaDescription($html);
                $bodyText = $this->cleanHtmlText($html);
                $this->log($job, 'URL fetched. Extracted title, meta description and page text.');
            } else {
                $this->log($job, "URL fetch returned HTTP {$response->status()}. Creating review draft from URL only.");
            }
        } catch (\Throwable $e) {
            $this->log($job, "URL fetch failed: {$e->getMessage()}. Creating review draft from URL only.");
        }

        $name = $this->guessNameFromUrl($url, $title);
        $existing = $this->findExistingSociety($name);

        if ($existing) {
            $this->log($job, "Skipped duplicate from URL: {$existing->name} already exists as ID {$existing->id}.");

            return [
                'name' => $existing->name,
                'status' => 'skipped',
                'id' => $existing->id,
                'edit_url' => "/admin/societies/{$existing->id}/edit",
                'message' => 'Duplicate skipped',
            ];
        }

        $context = trim(($description ? $description."\n\n" : '').$bodyText);

        $this->log($job, 'AI provider: '.$this->ai->provider().' | available: '.($this->ai->isAvailable() ? 'yes' : 'no'));

        $aiData = $this->ai->enrichSociety($name, $context, 'URL Import: '.$url);

        if (! empty($aiData['_ai_error']) && $this->ai->isAvailable()) {
            $message = ! empty($aiData['_ai_quota_limited'])
                ? 'AI quota/rate limit hit during URL extraction. Draft not created to avoid weak fallback data.'
                : 'AI URL extraction failed: '.$aiData['_ai_error'].'. Draft not created to avoid weak fallback data.';

            $this->log($job, $message);

            $job->update([
                'status' => 'failed',
                'failed_count' => (int) $job->failed_count + 1,
                'results' => array_merge($job->results ?? [], [[
                    'name' => $name,
                    'status' => 'failed',
                    'message' => $message,
                ]]),
                'completed_at' => now(),
            ]);

            return [
                'name' => $name,
                'status' => 'failed',
                'message' => $message,
            ];
        } elseif (! empty($aiData)) {
            $this->log($job, 'AI URL extraction parsed. Mapping structured fields into draft.');
        } else {
            $this->log($job, 'AI enrichment unavailable. Using URL title/meta fallback.');
        }

        $data = $this->draftDataByName($name, 'URL Import', $aiData);
        $data['source_url'] = $url;
        $data['official_project_url'] = $url;
        $data['official_source_url'] = $url;
        $data['source_name'] = 'URL Import';
        $data['official_source_status'] = 'Fetched / needs review';
        $data['official_source_last_checked_at'] = now();
        $data['official_source_notes'] = 'Imported from URL. Review all fields before publishing.';

        if ($description) {
            $data['description'] = Str::limit($description, 420, '');
            $data['meta_description'] = Str::limit($description, 150, '');
        } elseif ($bodyText) {
            $data['description'] = Str::limit($bodyText, 420, '');
            $data['meta_description'] = Str::limit($bodyText, 150, '');
        }

        $society = Society::create($data);

        $this->log($job, "Draft created from URL: {$society->name} (ID {$society->id}).");

        return [
            'name' => $society->name,
            'status' => 'created',
            'id' => $society->id,
            'edit_url' => "/admin/societies/{$society->id}/edit",
            'message' => 'Draft created from URL',
        ];
    }

    private function draftDataByName(string $name, string $source, array $aiData = []): array
    {
        $builder = $this->guessBuilder($name);
        $sector = $this->guessSector($name);
        $locality = $this->guessLocality($name, $sector);

        $base = [
            'name' => $name,
            'slug' => $this->uniqueSlug($name),
            'builder' => $builder,
            'sector' => $sector,
            'locality' => $locality,
            'city' => 'Gurugram',
            'state' => 'Haryana',
            'address' => trim(implode(', ', array_filter([$sector, $locality, 'Gurugram']))),
            'description' => "{$name} is imported as a draft society profile for SocietyFlats admin review. Verify builder, location, pricing, amenities, coordinates and official source before publishing.",
            'project_status' => 'Needs Review',
            'rent_range' => 'To be verified',
            'buy_range' => 'To be verified',
            'score' => 7.8,
            'security_score' => 7.7,
            'maintenance_score' => 7.6,
            'connectivity_score' => 7.9,
            'lifestyle_score' => 7.8,
            'investment_score' => 7.7,
            'amenities' => ['Clubhouse', 'Security', 'Parking', 'Power Backup'],
            'meta_title' => "{$name} Gurgaon | SocietyFlats",
            'meta_description' => "Review {$name} in Gurgaon on SocietyFlats. Verify rent, resale, amenities, map location and available homes before publishing.",
            'status' => 'Draft',
            'verification_status' => 'Needs Review',
            'is_published' => false,
            'published_at' => null,
            'featured' => false,
            'show_in_hero' => false,
            'search_boost' => false,
            'source_name' => $source,
            'source_confidence_score' => 35,
            'data_quality' => 'Draft imported - needs admin verification',
            'fields_to_verify' => [
                'builder',
                'sector',
                'address',
                'rent_range',
                'buy_range',
                'amenities',
                'coordinates',
                'official URLs',
                'RERA details',
                'images',
            ],
            'imported_at' => now(),
        ];

        return $this->mergeAiDraftData($base, $aiData, $name);
    }

    private function mergeAiDraftData(array $base, array $aiData, string $fallbackName): array
    {
        if (empty($aiData) || ! empty($aiData['_ai_error'])) {
            return $base;
        }

        $stringFields = [
            'builder',
            'sector',
            'locality',
            'city',
            'state',
            'address',
            'description',
            'project_status',
            'configuration',
            'project_area',
            'unit_size_range',
            'year_built',
            'total_towers',
            'total_units',
            'maintenance_charges',
            'rent_range',
            'buy_range',
            'rental_yield',
            'average_rent',
            'average_sale_price',
            'price_per_sqft',
            'google_maps_url',
            'image_reference_url',
            'image_url',
            'image_status',
            'image_alt_text',
            'image_credit',
            'image_license_notes',
            'rera_number',
            'rera_status',
            'meta_title',
            'meta_description',
            'data_quality',
        ];

        foreach ($stringFields as $field) {
            $value = $this->cleanAiString($aiData[$field] ?? null);

            if ($value !== null && $value !== '') {
                $base[$field] = $value;
            }
        }

        $arrayFields = [
            'amenities',
            'nearby_schools',
            'nearby_metro',
            'nearby_hospitals',
            'nearby_office_hubs',
            'fields_to_verify',
        ];

        foreach ($arrayFields as $field) {
            $value = $this->cleanAiStringArray($aiData[$field] ?? null);

            if (! empty($value)) {
                $base[$field] = $value;
            }
        }

        $faq = $this->cleanAiFaq($aiData['faq'] ?? null);
        if (! empty($faq)) {
            $base['faq'] = $faq;
        }

        foreach ([
            'score',
            'security_score',
            'maintenance_score',
            'connectivity_score',
            'lifestyle_score',
            'investment_score',
        ] as $field) {
            $score = $this->cleanAiScore($aiData[$field] ?? null);

            if ($score !== null) {
                $base[$field] = $score;
            }
        }

        $confidence = $this->cleanAiInteger($aiData['source_confidence_score'] ?? null, 0, 100);
        if ($confidence !== null) {
            $base['source_confidence_score'] = $confidence;
        }

        $latitude = $this->cleanAiFloat($aiData['latitude'] ?? null);
        $longitude = $this->cleanAiFloat($aiData['longitude'] ?? null);

        if ($latitude !== null && $longitude !== null) {
            $base['latitude'] = $latitude;
            $base['longitude'] = $longitude;
        } else {
            $this->appendImportVerifyField($base, 'coordinates');
        }

        $this->completeImportDraftMetadata($base);
        $this->strengthenImportScores($base);

        if (! empty($aiData['name']) && is_string($aiData['name'])) {
            $cleanName = trim($aiData['name']);

            if ($cleanName !== '' && mb_strlen($cleanName) <= 160) {
                $base['name'] = $cleanName;
            }
        }

        $base['slug'] = $this->uniqueSlug($base['name'] ?? $fallbackName);
        $base['status'] = 'Draft';
        $base['verification_status'] = 'Needs Review';
        $base['is_published'] = false;
        $base['published_at'] = null;

        return $base;
    }

    private function cleanAiString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            $value = implode(', ', array_filter(array_map(fn ($item) => trim((string) $item), $value)));
        }

        $value = trim((string) $value);

        if ($value === '' || strtolower($value) === 'null') {
            return null;
        }

        return $value;
    }

    private function cleanAiStringArray(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_string($value)) {
            $value = preg_split('/[,\n]+/', $value) ?: [];
        }

        if (! is_array($value)) {
            return [];
        }

        $items = [];

        foreach ($value as $item) {
            $clean = trim((string) $item);

            if ($clean !== '' && strtolower($clean) !== 'null') {
                $items[] = $clean;
            }
        }

        return array_values(array_unique($items));
    }

    private function cleanAiFaq(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $faq = [];

        foreach ($value as $item) {
            if (! is_array($item)) {
                continue;
            }

            $question = trim((string) ($item['question'] ?? ''));
            $answer = trim((string) ($item['answer'] ?? ''));

            if ($question !== '' && $answer !== '') {
                $faq[] = [
                    'question' => $question,
                    'answer' => $answer,
                ];
            }
        }

        return $faq;
    }

    private function completeImportDraftMetadata(array &$base): void
    {
        $name = trim((string) ($base['name'] ?? ''));
        $sector = trim((string) ($base['sector'] ?? ''));
        $locality = trim((string) ($base['locality'] ?? ''));
        $city = trim((string) ($base['city'] ?? 'Gurugram'));
        $state = trim((string) ($base['state'] ?? 'Haryana'));

        $queryParts = array_values(array_filter([$name, $sector, $locality, $city ?: 'Gurugram', $state ?: 'Haryana']));
        $query = trim(implode(' ', array_unique($queryParts)));

        if ((! isset($base['latitude']) || ! isset($base['longitude'])) && ! empty($base['google_maps_url'])) {
            $coords = $this->extractCoordinatesFromUrl((string) $base['google_maps_url']);

            if ($coords !== null) {
                $base['latitude'] = $coords[0];
                $base['longitude'] = $coords[1];
            }
        }

        if ($name !== '' && empty($base['google_maps_url']) && $query !== '') {
            $base['google_maps_url'] = 'https://www.google.com/maps/search/?api=1&query='.rawurlencode($query);
            $this->appendImportVerifyField($base, 'coordinates');
        }

        if ($name !== '' && empty($base['image_reference_url']) && empty($base['image_url'])) {
            $imageQuery = trim($query.' society exterior photos');
            $base['image_reference_url'] = 'https://www.google.com/search?tbm=isch&q='.rawurlencode($imageQuery);
            $base['image_status'] = 'needs_review';
            $base['image_alt_text'] = $name.' residential society image reference';
            $base['image_license_notes'] = 'Admin review required. Do not publish third-party images until licensed, self-shot, or developer-approved.';
            $this->appendImportVerifyField($base, 'image_rights');
        }

        if (! empty($base['image_reference_url']) || ! empty($base['image_url'])) {
            $base['image_approved_by_admin'] = false;

            if (empty($base['image_status']) || $base['image_status'] === 'placeholder') {
                $base['image_status'] = 'needs_review';
            }

            if (empty($base['image_alt_text']) && $name !== '') {
                $base['image_alt_text'] = $name.' residential society in Gurugram';
            }

            if (empty($base['image_license_notes'])) {
                $base['image_license_notes'] = 'Admin review required before publishing image live.';
            }
        }
    }

    private function extractCoordinatesFromUrl(string $url): ?array
    {
        if (preg_match('/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/', $url, $matches)) {
            return [round((float) $matches[1], 7), round((float) $matches[2], 7)];
        }

        $decoded = urldecode($url);

        if (preg_match('/(?:query|q)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/', $decoded, $matches)) {
            return [round((float) $matches[1], 7), round((float) $matches[2], 7)];
        }

        return null;
    }

    private function strengthenImportScores(array &$base): void
    {
        $scoreFields = [
            'score',
            'security_score',
            'maintenance_score',
            'connectivity_score',
            'lifestyle_score',
            'investment_score',
        ];

        $existing = [];

        foreach ($scoreFields as $field) {
            if (isset($base[$field]) && is_numeric($base[$field])) {
                $existing[$field] = round((float) $base[$field], 1);
            }
        }

        $unique = array_unique(array_map(static fn ($value) => number_format((float) $value, 1, '.', ''), $existing));
        $verifyFields = $base['fields_to_verify'] ?? [];
        $scoreNeedsReview = is_array($verifyFields) && count(array_intersect($scoreFields, $verifyFields)) > 0;

        $fallbackPattern = (
            isset($base['score'], $base['security_score'], $base['maintenance_score'], $base['connectivity_score'], $base['lifestyle_score'], $base['investment_score'])
            && number_format((float) $base['score'], 1, '.', '') === '7.8'
            && number_format((float) $base['security_score'], 1, '.', '') === '7.7'
            && number_format((float) $base['maintenance_score'], 1, '.', '') === '7.6'
            && number_format((float) $base['connectivity_score'], 1, '.', '') === '7.9'
            && number_format((float) $base['lifestyle_score'], 1, '.', '') === '7.8'
            && number_format((float) $base['investment_score'], 1, '.', '') === '7.7'
        );

        $needsCalibration = count($existing) < count($scoreFields)
            || count($unique) <= 1
            || $scoreNeedsReview
            || $fallbackPattern;

        if (! $needsCalibration) {
            return;
        }

        $text = strtolower(implode(' ', array_filter([
            $base['name'] ?? '',
            $base['builder'] ?? '',
            $base['sector'] ?? '',
            $base['locality'] ?? '',
            $base['address'] ?? '',
        ])));

        $baseScore = 7.4;
        $builderBoost = 0.0;
        $locationBoost = 0.0;

        foreach (['dlf', 'm3m', 'emaar', 'central park', 'ireo', 'godrej', 'tata', 'adani', 'sobha', 'bestech', 'ambience', 'vatika'] as $builder) {
            if (str_contains($text, $builder)) {
                $builderBoost = max($builderBoost, 0.45);
            }
        }

        foreach (['golf course road', 'golf course extension', 'cyber city', 'dlf phase', 'sector 42', 'sector 43', 'sector 54', 'sector 55', 'sector 56', 'sector 57', 'sector 58', 'sector 59', 'sector 60', 'sector 61', 'sector 62', 'sector 63', 'sector 65', 'sector 66'] as $primeLocation) {
            if (str_contains($text, $primeLocation)) {
                $locationBoost = max($locationBoost, 0.5);
            }
        }

        foreach (['dwarka expressway', 'sector 102', 'sector 103', 'sector 104', 'sector 106', 'sector 108', 'sector 109', 'sector 110', 'sector 111', 'sector 112', 'sector 113'] as $growthLocation) {
            if (str_contains($text, $growthLocation)) {
                $locationBoost = max($locationBoost, 0.25);
            }
        }

        $baseScore += $builderBoost + $locationBoost;

        $calibrated = [
            'security_score' => $baseScore + 0.15,
            'maintenance_score' => $baseScore - 0.05,
            'connectivity_score' => $baseScore + $locationBoost + 0.15,
            'lifestyle_score' => $baseScore + 0.20,
            'investment_score' => $baseScore + ($builderBoost / 2) + ($locationBoost / 2),
        ];

        foreach ($calibrated as $field => $value) {
            $base[$field] = $this->clampImportScore($value);
        }

        $base['score'] = $this->clampImportScore(array_sum($calibrated) / count($calibrated));
        $this->appendImportVerifyField($base, 'scores');
    }

    private function clampImportScore(float $score): float
    {
        return round(max(6.8, min(9.4, $score)), 1);
    }

    private function appendImportVerifyField(array &$base, string $field): void
    {
        $current = $base['fields_to_verify'] ?? [];

        if (! is_array($current)) {
            $current = array_filter([(string) $current]);
        }

        if (! in_array($field, $current, true)) {
            $current[] = $field;
        }

        $base['fields_to_verify'] = array_values($current);
    }

    private function cleanAiScore(mixed $value): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }

        $score = (float) $value;

        if ($score < 0 || $score > 10) {
            return null;
        }

        return round($score, 1);
    }

    private function cleanAiInteger(mixed $value, int $min, int $max): ?int
    {
        if (! is_numeric($value)) {
            return null;
        }

        $int = (int) $value;

        if ($int < $min || $int > $max) {
            return null;
        }

        return $int;
    }

    private function cleanAiFloat(mixed $value): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }

    private function findExistingSociety(string $name): ?Society
    {
        $slug = Str::slug($name);

        return Society::query()
            ->where('slug', $slug)
            ->orWhereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'society';
        $slug = $base;
        $i = 2;

        while (Society::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function decodePayload(string $raw): array
    {
        $data = json_decode($raw, true);

        return is_array($data) ? $data : [];
    }

    private function decodeNamesInput(string $raw): array
    {
        $decoded = json_decode($raw, true);

        if (is_array($decoded)) {
            $names = $decoded;
        } else {
            $names = preg_split('/[\r\n,]+/', $raw) ?: [];
        }

        return array_values(array_unique(array_filter(array_map(function ($name) {
            return trim((string) $name);
        }, $names))));
    }

    private function bulkCandidateNames(string $source, string $locality, int $limit): array
    {
        $needle = mb_strtolower(trim($locality));
        $items = $this->knownGurgaonSocieties();

        if ($needle && ! in_array($needle, ['gurgaon', 'gurugram', 'all'], true)) {
            $filtered = array_filter($items, function ($item) use ($needle) {
                return str_contains(mb_strtolower($item['sector'] ?? ''), $needle)
                    || str_contains(mb_strtolower($item['locality'] ?? ''), $needle)
                    || str_contains(mb_strtolower($item['name'] ?? ''), $needle);
            });

            if (! empty($filtered)) {
                $items = array_values($filtered);
            }
        }

        return array_slice(array_map(fn ($item) => $item['name'], $items), 0, $limit);
    }

    private function log(SocietyImportJob $job, string $message): void
    {
        $logs = $job->logs ?: [];
        $logs[] = [
            'ts' => now()->format('H:i:s'),
            'msg' => $message,
        ];

        $job->update(['logs' => $logs]);
        $job->refresh();
    }

    private function statusForResult(array $result): string
    {
        $status = $result['status'] ?? 'failed';

        if ($status === 'created') {
            return 'completed';
        }

        if ($status === 'skipped') {
            return 'skipped';
        }

        return 'failed';
    }

    private function sourceLabel(string $source): string
    {
        $value = mb_strtolower($source);

        if (str_contains($value, '99')) {
            return '99acres';
        }

        if (str_contains($value, 'nobroker')) {
            return 'NoBroker';
        }

        if (str_contains($value, 'magic')) {
            return 'MagicBricks';
        }

        return $source ?: 'Bulk Source';
    }

    private function guessBuilder(string $name): string
    {
        $builders = [
            'DLF',
            'M3M',
            'Emaar',
            'Adani',
            'Godrej',
            'Tata',
            'ATS',
            'Sobha',
            'Ireo',
            'Experion',
            'Tulip',
            'Signature Global',
            'Conscient',
            'Central Park',
            'Ambience',
            'AIPL',
            'Paras',
            'Puri',
            'Vatika',
            'Bestech',
            'Mapsko',
            'Ansal',
            'BPTP',
            'Raheja',
            'Alpha Corp',
            'Mahindra',
            'Pioneer',
            'Whiteland',
            'SS Group',
            'ROF',
            'Vipul',
        ];

        foreach ($builders as $builder) {
            if (stripos($name, $builder) !== false) {
                return $builder;
            }
        }

        return 'To be verified';
    }

    private function guessSector(string $name): string
    {
        if (preg_match('/sector\s*[- ]?\s*(\d+[a-zA-Z]?)/i', $name, $match)) {
            return 'Sector '.strtoupper($match[1]);
        }

        foreach ($this->knownGurgaonSocieties() as $item) {
            if (mb_strtolower($item['name']) === mb_strtolower($name)) {
                return $item['sector'] ?? 'Gurgaon';
            }
        }

        return 'Gurgaon';
    }

    private function guessLocality(string $name, string $sector): string
    {
        foreach ($this->knownGurgaonSocieties() as $item) {
            if (mb_strtolower($item['name']) === mb_strtolower($name)) {
                return $item['locality'] ?? 'Gurgaon';
            }
        }

        if (in_array($sector, ['Sector 65', 'Sector 66', 'Sector 67'], true)) {
            return 'Golf Course Extension Road';
        }

        if (in_array($sector, ['Sector 102', 'Sector 103', 'Sector 104', 'Sector 106', 'Sector 108', 'Sector 109', 'Sector 110', 'Sector 111', 'Sector 112', 'Sector 113'], true)) {
            return 'Dwarka Expressway';
        }

        if (in_array($sector, ['Sector 54', 'Sector 55', 'Sector 56'], true)) {
            return 'Golf Course Road';
        }

        if (in_array($sector, ['Sector 48', 'Sector 49', 'Sector 50'], true)) {
            return 'Sohna Road';
        }

        return 'Gurgaon';
    }

    private function guessNameFromUrl(string $url, string $title): string
    {
        $candidate = trim($title);

        if ($candidate !== '') {
            $candidate = preg_replace('/\s+[-|].*$/', '', $candidate) ?: $candidate;
            $candidate = trim($candidate);

            if (mb_strlen($candidate) >= 3) {
                return Str::limit($candidate, 90, '');
            }
        }

        $path = parse_url($url, PHP_URL_PATH) ?: '';
        $slug = trim(basename($path), '/');

        if ($slug === '' || $slug === 'index.php') {
            $host = parse_url($url, PHP_URL_HOST) ?: 'Imported Society';
            $slug = preg_replace('/^www\./', '', $host);
        }

        return Str::headline(str_replace(['-', '_', '+'], ' ', $slug));
    }

    private function extractTitle(string $html): string
    {
        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $match)) {
            return trim(html_entity_decode(strip_tags($match[1])));
        }

        return '';
    }

    private function extractMetaDescription(string $html): string
    {
        if (preg_match('/<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']/is', $html, $match)) {
            return trim(html_entity_decode($match[1]));
        }

        if (preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']/is', $html, $match)) {
            return trim(html_entity_decode($match[1]));
        }

        return '';
    }

    private function cleanHtmlText(string $html): string
    {
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', ' ', $html) ?: $html;
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', ' ', $html) ?: $html;
        $text = html_entity_decode(strip_tags($html));
        $text = preg_replace('/\s+/', ' ', $text) ?: '';

        return trim($text);
    }

    private function knownGurgaonSocieties(): array
    {
        return [
            ['name' => 'DLF Magnolias', 'sector' => 'Sector 42', 'locality' => 'Golf Course Road'],
            ['name' => 'DLF Aralias', 'sector' => 'Sector 42', 'locality' => 'Golf Course Road'],
            ['name' => 'DLF Camellias', 'sector' => 'Sector 42', 'locality' => 'Golf Course Road'],
            ['name' => 'DLF Park Place', 'sector' => 'Sector 54', 'locality' => 'Golf Course Road'],
            ['name' => 'DLF The Icon', 'sector' => 'Sector 43', 'locality' => 'Golf Course Road'],
            ['name' => 'DLF Belaire', 'sector' => 'Sector 54', 'locality' => 'Golf Course Road'],
            ['name' => 'DLF Beverly Park 2', 'sector' => 'Sector 25', 'locality' => 'MG Road'],
            ['name' => 'Ambience Caitriona', 'sector' => 'Sector 24', 'locality' => 'NH-8'],
            ['name' => 'M3M Golfestate', 'sector' => 'Sector 65', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'M3M Merlin', 'sector' => 'Sector 67', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'M3M Latitude', 'sector' => 'Sector 65', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'M3M Heights', 'sector' => 'Sector 65', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Emaar Palm Gardens', 'sector' => 'Sector 83', 'locality' => 'New Gurgaon'],
            ['name' => 'Emaar Palm Drive', 'sector' => 'Sector 66', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Emaar Emerald Hills', 'sector' => 'Sector 65', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Emaar Digi Homes', 'sector' => 'Sector 62', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Adani Samsara Vilasa', 'sector' => 'Sector 63', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Godrej Summit', 'sector' => 'Sector 104', 'locality' => 'Dwarka Expressway'],
            ['name' => 'Godrej Meridien', 'sector' => 'Sector 106', 'locality' => 'Dwarka Expressway'],
            ['name' => 'ATS Triumph', 'sector' => 'Sector 104', 'locality' => 'Dwarka Expressway'],
            ['name' => 'ATS Kocoon', 'sector' => 'Sector 109', 'locality' => 'Dwarka Expressway'],
            ['name' => 'Sobha City', 'sector' => 'Sector 108', 'locality' => 'Dwarka Expressway'],
            ['name' => 'Experion Windchants', 'sector' => 'Sector 112', 'locality' => 'Dwarka Expressway'],
            ['name' => 'Puri Diplomatic Greens', 'sector' => 'Sector 111', 'locality' => 'Dwarka Expressway'],
            ['name' => 'Tata La Vida', 'sector' => 'Sector 113', 'locality' => 'Dwarka Expressway'],
            ['name' => 'Hero Homes Gurgaon', 'sector' => 'Sector 104', 'locality' => 'Dwarka Expressway'],
            ['name' => 'Central Park Resorts', 'sector' => 'Sector 48', 'locality' => 'Sohna Road'],
            ['name' => 'Central Park Flower Valley', 'sector' => 'Sector 32', 'locality' => 'Sohna Road'],
            ['name' => 'Vipul Greens', 'sector' => 'Sector 48', 'locality' => 'Sohna Road'],
            ['name' => 'Vatika City', 'sector' => 'Sector 49', 'locality' => 'Sohna Road'],
            ['name' => 'Bestech Park View Spa', 'sector' => 'Sector 47', 'locality' => 'Sohna Road'],
            ['name' => 'Bestech Park View City 2', 'sector' => 'Sector 49', 'locality' => 'Sohna Road'],
            ['name' => 'Ireo Victory Valley', 'sector' => 'Sector 67', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Ireo Skyon', 'sector' => 'Sector 60', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Ireo Grand Arch', 'sector' => 'Sector 58', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'AIPL The Peaceful Homes', 'sector' => 'Sector 70A', 'locality' => 'SPR'],
            ['name' => 'Paras Irene', 'sector' => 'Sector 70A', 'locality' => 'SPR'],
            ['name' => 'Pioneer Park', 'sector' => 'Sector 61', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Mahindra Luminare', 'sector' => 'Sector 59', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Conscient Hines Elevate', 'sector' => 'Sector 59', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Whiteland The Aspen', 'sector' => 'Sector 76', 'locality' => 'SPR'],
            ['name' => 'Signature Global City 37D', 'sector' => 'Sector 37D', 'locality' => 'Dwarka Expressway'],
            ['name' => 'Signature Global Park', 'sector' => 'Sector 36', 'locality' => 'Sohna Road'],
            ['name' => 'Mapsko Mount Ville', 'sector' => 'Sector 79', 'locality' => 'New Gurgaon'],
            ['name' => 'Vatika Seven Lamps', 'sector' => 'Sector 82', 'locality' => 'New Gurgaon'],
            ['name' => 'Ansal Esencia', 'sector' => 'Sector 67', 'locality' => 'Golf Course Extension Road'],
            ['name' => 'Raheja Revanta', 'sector' => 'Sector 78', 'locality' => 'New Gurgaon'],
            ['name' => 'BPTP Terra', 'sector' => 'Sector 37D', 'locality' => 'Dwarka Expressway'],
            ['name' => 'SS The Leaf', 'sector' => 'Sector 85', 'locality' => 'New Gurgaon'],
            ['name' => 'ROF Insignia Park', 'sector' => 'Sector 93', 'locality' => 'New Gurgaon'],
        ];
    }
}
