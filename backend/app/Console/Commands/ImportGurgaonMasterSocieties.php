<?php

namespace App\Console\Commands;

use App\Models\Society;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ImportGurgaonMasterSocieties extends Command
{
    protected $signature = 'societies:import-gurgaon-master
        {--file=database/imports/gurgaon_societies_150.json : JSON export from the SocietyFlats Gurgaon master workbook}
        {--limit=0 : Maximum records to import, 0 imports all records}
        {--reset-unverified : Clear unverified stats, amenities, nearby data, coordinates and unsafe media while importing}
        {--dry-run : Preview records without writing to the database}';

    protected $description = 'Import the curated SocietyFlats Gurgaon master society list as draft profiles.';

    private const SAFE_IMAGE_STATUSES = ['approved', 'licensed', 'licensed_uploaded', 'self_shot', 'self_shot_uploaded', 'developer_approved', 'developer_permission_received'];

    public function handle(): int
    {
        $file = base_path((string) $this->option('file'));
        $limit = max(0, (int) $this->option('limit'));
        $resetUnverified = (bool) $this->option('reset-unverified');
        $dryRun = (bool) $this->option('dry-run');

        if (! is_file($file)) {
            $this->error("Import file not found: {$file}");

            return self::FAILURE;
        }

        $rows = json_decode((string) file_get_contents($file), true);

        if (! is_array($rows)) {
            $this->error('Import file is not valid JSON.');

            return self::FAILURE;
        }

        if ($resetUnverified) {
            $this->warn('Reset mode enabled: unverified stats, amenities, nearby data, coordinates and unsafe media will be cleared/rewritten.');
        }

        if ($limit > 0) {
            $rows = array_slice($rows, 0, $limit);
        }

        $created = 0;
        $skippedDuplicates = 0;
        $skippedNonResidential = 0;
        $failed = 0;
        $seen = [];

        foreach ($rows as $index => $row) {
            if (! is_array($row)) {
                $failed++;
                $this->error('Row '.($index + 1).' failed: expected a JSON object.');

                continue;
            }

            if ($this->looksCommercial($row)) {
                $skippedNonResidential++;

                continue;
            }

            $payload = $this->payloadFromRow($row, $resetUnverified);

            if (! $payload) {
                $failed++;
                $this->error('Row '.($index + 1).' failed: name and slug are required.');

                continue;
            }

            $identity = $this->importIdentityKey($payload);

            if (isset($seen[$identity])) {
                $skippedDuplicates++;
                $this->warn("Skipped duplicate input row: {$payload['name']}.");

                continue;
            }

            $seen[$identity] = true;
            $duplicate = $this->findDuplicate($payload);

            if ($duplicate) {
                $skippedDuplicates++;
                $this->warn("Skipped duplicate: {$payload['name']} matches society ID {$duplicate->id} ({$duplicate->name}).");

                continue;
            }

            if ($dryRun) {
                $created++;
                $this->line(sprintf(
                    '- %s | %s | %s | %s',
                    $payload['name'],
                    $payload['builder'] ?: 'builder unknown',
                    $payload['sector'] ?: 'sector pending',
                    $payload['source_url'] ?: 'source pending'
                ));

                continue;
            }

            try {
                Society::create($payload);
                $created++;
            } catch (\Throwable $exception) {
                $failed++;
                $this->error('Row '.($index + 1)." failed ({$payload['name']}): {$exception->getMessage()}");
            }
        }

        $summary = [
            'mode' => $dryRun ? 'dry-run' : 'import',
            'total_rows' => count($rows),
            $dryRun ? 'would_create' : 'created' => $created,
            'skipped_duplicates' => $skippedDuplicates,
            'skipped_non_residential' => $skippedNonResidential,
            'failed' => $failed,
        ];

        $this->info($dryRun ? 'Dry run complete. No database rows were written.' : 'Draft import complete.');
        $this->line('SUMMARY '.json_encode($summary, JSON_UNESCAPED_SLASHES));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>|null
     */
    private function payloadFromRow(array $row, bool $resetUnverified): ?array
    {
        $name = trim((string) (($row['official_name'] ?? null) ?: ($row['society_name'] ?? null) ?: ($row['name'] ?? '')));
        $slug = trim((string) (($row['slug'] ?? null) ?: Str::slug($name)));

        if (! $name || ! $slug) {
            return null;
        }

        $sector = trim((string) ($row['sector'] ?? '')) ?: $this->sectorFromText((string) ($row['approx_area_sector'] ?? ''));
        $locality = trim((string) (($row['micro_market'] ?? null) ?: ($row['locality'] ?? null) ?: ($row['approx_area_sector'] ?? null) ?: 'Gurugram'));
        $imageUrl = trim((string) ($row['image_url'] ?? ''));
        $imageStatus = Str::lower(trim((string) ($row['image_status'] ?? '')));
        $safeImage = $imageUrl && $imageUrl !== 'placeholder' && in_array($imageStatus, self::SAFE_IMAGE_STATUSES, true);

        $notes = trim((string) ($row['notes_fields_to_verify'] ?? ''));
        $confidence = $row['source_confidence_score'] ?? null;
        $verificationStatus = trim((string) ($row['verification_status'] ?? 'needs_verification'));
        $imageStatusText = trim((string) ($row['image_status'] ?? 'placeholder')) ?: 'placeholder';
        $scores = $this->scoresFromRow($row, $sector, $locality);
        $officialProjectUrl = trim((string) ($row['official_project_url'] ?? '')) ?: null;
        $officialDeveloperUrl = trim((string) ($row['official_developer_url'] ?? '')) ?: null;
        $officialBrochureUrl = trim((string) ($row['official_brochure_url'] ?? '')) ?: null;
        $officialFloorPlanUrl = trim((string) ($row['official_floor_plan_url'] ?? '')) ?: null;
        $officialGalleryUrl = trim((string) ($row['official_gallery_url'] ?? '')) ?: null;
        $reraSearchUrl = trim((string) ($row['rera_search_url'] ?? '')) ?: null;
        $googleMapsUrl = trim((string) ($row['google_maps_search_url'] ?? $row['google_maps_url'] ?? '')) ?: null;
        $officialSourceStatus = trim((string) ($row['official_source_status'] ?? 'pending')) ?: 'pending';
        $officialSourceNotes = trim((string) ($row['official_source_notes'] ?? '')) ?: 'Needs manual verification.';

        $payload = [
            'name' => $name,
            'slug' => $slug,
            'builder' => trim((string) ($row['developer_builder'] ?? '')) ?: null,
            'sector' => $sector,
            'locality' => $locality,
            'city' => trim((string) ($row['city'] ?? 'Gurugram')) ?: 'Gurugram',
            'state' => trim((string) ($row['state'] ?? 'Haryana')) ?: 'Haryana',
            'society_type' => trim((string) ($row['society_type'] ?? '')) ?: null,
            'address' => trim((string) ($row['address'] ?? $row['approx_area_sector'] ?? '')) ?: null,
            'description' => trim((string) ($row['description'] ?? '')) ?: $this->descriptionFromRow($row, $name, $sector, $locality),
            'project_status' => trim((string) ($row['project_status'] ?? $row['launch_status'] ?? '')) ?: null,
            'configuration' => trim((string) ($row['configuration'] ?? '')) ?: null,
            'project_area' => trim((string) ($row['project_area'] ?? '')) ?: null,
            'unit_size_range' => trim((string) ($row['unit_size_range'] ?? '')) ?: null,
            'amenities' => $this->listFromRow($row['amenities'] ?? []),
            'nearby_schools' => $this->listFromRow($row['nearby_schools'] ?? []),
            'nearby_metro' => $this->listFromRow($row['nearby_metro'] ?? []),
            'nearby_hospitals' => $this->listFromRow($row['nearby_hospitals'] ?? []),
            'nearby_office_hubs' => $this->listFromRow($row['nearby_office_hubs'] ?? []),
            'meta_title' => trim((string) ($row['meta_title'] ?? '')) ?: "{$name} Gurgaon - Society Profile",
            'meta_description' => trim((string) ($row['meta_description'] ?? '')) ?: $this->metaDescriptionFromRow($row, $name, $sector, $locality),
            'status' => 'Draft',
            'verification_status' => 'needs_verification',
            'is_published' => false,
            'published_at' => null,
            'featured' => false,
            'show_in_hero' => false,
            'search_boost' => false,
            'score' => $scores['overall'],
            'security_score' => $scores['security'],
            'maintenance_score' => $scores['maintenance'],
            'connectivity_score' => $scores['connectivity'],
            'lifestyle_score' => $scores['lifestyle'],
            'investment_score' => $scores['investment'],
            'latitude' => ! empty($row['latitude']) ? (string) $row['latitude'] : null,
            'longitude' => ! empty($row['longitude']) ? (string) $row['longitude'] : null,
            'cover_image' => $safeImage ? $imageUrl : null,
            'gallery_images' => $safeImage ? [$imageUrl] : [],
            'image_reference_url' => trim((string) ($row['image_reference_url'] ?? $row['image_search_url'] ?? '')) ?: null,
            'image_url' => $safeImage ? $imageUrl : null,
            'image_status' => $safeImage ? $imageStatusText : 'placeholder',
            'image_approved_by_admin' => false,
            'image_alt_text' => trim((string) ($row['image_alt_text'] ?? '')) ?: "{$name} residential society in Gurugram",
            'image_credit' => trim((string) ($row['image_credit'] ?? '')) ?: null,
            'image_license_notes' => trim((string) ($row['image_license_notes'] ?? '')) ?: 'Placeholder only. Do not publish third-party images until licensed, self-shot, or developer-approved.',
            'rera_number' => trim((string) ($row['rera_id'] ?? '')) ?: null,
            'source_name' => 'SocietyFlats Gurgaon master workbook',
            'source_url' => $officialProjectUrl ?: $reraSearchUrl ?: $googleMapsUrl,
            'official_project_url' => $officialProjectUrl,
            'official_developer_url' => $officialDeveloperUrl,
            'official_brochure_url' => $officialBrochureUrl,
            'official_floor_plan_url' => $officialFloorPlanUrl,
            'official_gallery_url' => $officialGalleryUrl,
            'official_source_status' => $officialSourceStatus,
            'official_source_notes' => $officialSourceNotes,
            'rera_search_url' => $reraSearchUrl,
            'google_maps_url' => $googleMapsUrl,
            'source_confidence_score' => max(0, min(100, (int) ($row['source_confidence_score'] ?? 0))),
            'data_quality' => Str::limit("Workbook import | {$verificationStatus} | confidence {$confidence} | image {$imageStatusText} | {$notes}", 255, ''),
            'imported_at' => now(),
        ];

        if ($resetUnverified) {
            $payload += [
                'year_built' => null,
                'total_towers' => null,
                'total_units' => null,
                'maintenance_charges' => null,
                'rent_range' => null,
                'buy_range' => null,
                'rental_yield' => null,
                'average_rent' => null,
                'average_sale_price' => null,
                'price_per_sqft' => null,
                'amenities' => [],
                'nearby_schools' => null,
                'nearby_metro' => null,
                'nearby_hospitals' => null,
                'nearby_office_hubs' => null,
            ];

            if (empty($row['latitude']) || empty($row['longitude'])) {
                $payload['latitude'] = null;
                $payload['longitude'] = null;
            }
        }

        return $payload;
    }

    /** @return array<int, string> */
    private function listFromRow(mixed $value): array
    {
        if (is_string($value)) {
            $value = preg_split('/[|,;\n]+/', $value) ?: [];
        }

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            fn ($item) => trim((string) $item),
            $value,
        ))));
    }

    /**
     * Match conservatively by slug, or by normalized name plus sector/locality.
     * Existing records are always skipped; imports never overwrite reviewed data.
     *
     * @param  array<string, mixed>  $payload
     */
    private function findDuplicate(array $payload): ?Society
    {
        $name = mb_strtolower(trim((string) $payload['name']));
        $sector = mb_strtolower(trim((string) ($payload['sector'] ?? '')));
        $locality = mb_strtolower(trim((string) ($payload['locality'] ?? '')));

        return Society::query()
            ->where('slug', $payload['slug'])
            ->orWhere(function ($query) use ($name, $sector, $locality) {
                $query->whereRaw('LOWER(name) = ?', [$name]);

                if ($sector !== '' || $locality !== '') {
                    $query->where(function ($location) use ($sector, $locality) {
                        if ($sector !== '') {
                            $location->orWhereRaw('LOWER(COALESCE(sector, ?)) = ?', ['', $sector]);
                        }

                        if ($locality !== '') {
                            $location->orWhereRaw('LOWER(COALESCE(locality, ?)) = ?', ['', $locality]);
                        }
                    });
                }
            })
            ->first();
    }

    /** @param array<string, mixed> $payload */
    private function importIdentityKey(array $payload): string
    {
        return implode('|', [
            mb_strtolower(trim((string) $payload['slug'])),
            mb_strtolower(trim((string) $payload['name'])),
            mb_strtolower(trim((string) ($payload['sector'] ?? ''))),
            mb_strtolower(trim((string) ($payload['locality'] ?? ''))),
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function descriptionFromRow(array $row, string $name, ?string $sector, string $locality): string
    {
        $builder = trim((string) ($row['developer_builder'] ?? ''));
        $type = trim((string) ($row['society_type'] ?? 'residential society'));
        $area = trim((string) ($row['approx_area_sector'] ?? 'Gurugram'));
        $priority = trim((string) ($row['priority'] ?? 'Medium'));

        $parts = [];
        $parts[] = "{$name} is a {$type} in {$area}.";
        if ($builder) {
            $parts[] = "The project is associated with {$builder}.";
        }
        $parts[] = "SocietyFlats has imported this as a draft profile for {$locality} so RERA status, map pin, tower and unit details, amenities, pricing and images can be verified before publishing.";
        $parts[] = "Priority: {$priority}.";

        return implode(' ', $parts);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function metaDescriptionFromRow(array $row, string $name, ?string $sector, string $locality): string
    {
        $builder = trim((string) ($row['developer_builder'] ?? ''));
        $location = trim(implode(', ', array_filter([$sector, $locality, 'Gurugram'])));
        $builderText = $builder ? " by {$builder}" : '';

        return Str::limit("Draft SocietyFlats profile for {$name}{$builderText} in {$location}. Verify RERA, location, amenities, images and market data before publishing.", 160, '');
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, float>
     */
    private function scoresFromRow(array $row, ?string $sector, string $locality): array
    {
        $builder = Str::lower((string) ($row['developer_builder'] ?? ''));
        $market = Str::lower($locality.' '.($row['approx_area_sector'] ?? ''));
        $priority = Str::lower((string) ($row['priority'] ?? 'medium'));
        $type = Str::lower((string) ($row['society_type'] ?? ''));

        $builderBonus = str_contains($builder, 'dlf') || str_contains($builder, 'emaar') || str_contains($builder, 'm3m') || str_contains($builder, 'tata') || str_contains($builder, 'godrej') || str_contains($builder, 'sobha') ? 0.35 : 0.1;
        $premiumMarket = str_contains($market, 'golf course road') || str_contains($market, 'golf course extension') || str_contains($market, 'sector 42') || str_contains($market, 'sector 54') || str_contains($market, 'sector 65');
        $connectivityMarket = str_contains($market, 'dwarka expressway') || str_contains($market, 'nh') || str_contains($market, 'sohna road') || str_contains($market, 'new gurgaon');
        $priorityBonus = $priority === 'high' ? 0.25 : ($priority === 'low' ? -0.1 : 0.05);
        $groupHousingBonus = str_contains($type, 'group housing') || str_contains($type, 'apartment') ? 0.15 : 0.0;

        $security = $this->boundedScore(7.4 + $builderBonus + $groupHousingBonus);
        $maintenance = $this->boundedScore(7.2 + $builderBonus + $groupHousingBonus + ($premiumMarket ? 0.25 : 0));
        $connectivity = $this->boundedScore(7.1 + ($premiumMarket ? 0.55 : 0) + ($connectivityMarket ? 0.45 : 0) + ($sector ? 0.15 : 0));
        $lifestyle = $this->boundedScore(7.1 + ($premiumMarket ? 0.65 : 0) + $builderBonus + $priorityBonus);
        $investment = $this->boundedScore(7.0 + ($premiumMarket ? 0.45 : 0) + ($connectivityMarket ? 0.35 : 0) + $builderBonus + $priorityBonus);
        $overall = round(($security + $maintenance + $connectivity + $lifestyle + $investment) / 5, 1);

        return compact('overall', 'security', 'maintenance', 'connectivity', 'lifestyle', 'investment');
    }

    private function boundedScore(float $score): float
    {
        return round(max(6.8, min(9.4, $score)), 1);
    }

    private function sectorFromText(string $text): ?string
    {
        if (preg_match('/Sector[\s\/-]*[0-9A-Za-z]+/i', $text, $matches)) {
            return trim(str_replace('/', '', $matches[0]));
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function looksCommercial(array $row): bool
    {
        $haystack = Str::lower(implode(' ', array_filter([
            $row['society_name'] ?? '',
            $row['society_type'] ?? '',
            $row['approx_area_sector'] ?? '',
        ])));

        foreach (['commercial', 'retail', 'office', 'mall', 'shop', 'sco', 'business park', 'serviced apartment'] as $keyword) {
            if (preg_match('/\b'.preg_quote($keyword, '/').'\b/i', $haystack)) {
                return true;
            }
        }

        return false;
    }
}
