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
        {--dry-run : Preview records without writing to the database}';

    protected $description = 'Import the curated SocietyFlats Gurgaon master society list as draft profiles.';

    private const SAFE_IMAGE_STATUSES = ['approved', 'licensed', 'self_shot', 'developer_approved'];

    public function handle(): int
    {
        $file = base_path((string) $this->option('file'));
        $limit = max(0, (int) $this->option('limit'));
        $dryRun = (bool) $this->option('dry-run');

        if (!is_file($file)) {
            $this->error("Import file not found: {$file}");
            return self::FAILURE;
        }

        $rows = json_decode((string) file_get_contents($file), true);

        if (!is_array($rows)) {
            $this->error('Import file is not valid JSON.');
            return self::FAILURE;
        }

        if ($limit > 0) {
            $rows = array_slice($rows, 0, $limit);
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            $payload = $this->payloadFromRow($row);

            if (!$payload) {
                $skipped++;
                continue;
            }

            if ($dryRun) {
                $this->line(sprintf(
                    '- %s | %s | %s | %s',
                    $payload['name'],
                    $payload['builder'] ?: 'builder unknown',
                    $payload['sector'] ?: 'sector pending',
                    $payload['source_url'] ?: 'source pending'
                ));
                continue;
            }

            $society = Society::updateOrCreate(['slug' => $payload['slug']], $payload);
            $society->wasRecentlyCreated ? $created++ : $updated++;
        }

        $this->info($dryRun
            ? 'Dry run complete. Found '.(count($rows) - $skipped)." importable records, skipped {$skipped}."
            : "Import complete. Created {$created}, updated {$updated}, skipped {$skipped}."
        );

        return self::SUCCESS;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>|null
     */
    private function payloadFromRow(array $row): ?array
    {
        $name = trim((string) ($row['official_name'] ?: $row['society_name'] ?: ''));
        $slug = trim((string) ($row['slug'] ?: Str::slug($name)));

        if (!$name || !$slug || $this->looksCommercial($row)) {
            return null;
        }

        $sector = $this->sectorFromText((string) ($row['approx_area_sector'] ?? ''));
        $locality = trim((string) ($row['micro_market'] ?: $row['approx_area_sector'] ?: 'Gurugram'));
        $imageUrl = trim((string) ($row['image_url'] ?? ''));
        $imageStatus = Str::lower(trim((string) ($row['image_status'] ?? '')));
        $safeImage = $imageUrl && $imageUrl !== 'placeholder' && in_array($imageStatus, self::SAFE_IMAGE_STATUSES, true);

        $notes = trim((string) ($row['notes_fields_to_verify'] ?? ''));
        $confidence = $row['source_confidence_score'] ?? null;
        $verificationStatus = trim((string) ($row['verification_status'] ?? 'needs_verification'));
        $imageStatusText = trim((string) ($row['image_status'] ?? 'pending'));

        return [
            'name' => $name,
            'slug' => $slug,
            'builder' => trim((string) ($row['developer_builder'] ?? '')) ?: null,
            'sector' => $sector,
            'locality' => $locality,
            'address' => trim((string) ($row['approx_area_sector'] ?? '')) ?: null,
            'description' => "Imported from the SocietyFlats Gurgaon master list for {$name}. Verify RERA, map pin, official project details, amenities and images before publishing.",
            'meta_title' => "{$name} Gurgaon - Society Profile",
            'meta_description' => "Draft SocietyFlats profile for {$name} in Gurugram. Imported from the curated Gurgaon master list and pending verification.",
            'status' => 'Draft',
            'featured' => false,
            'show_in_hero' => false,
            'search_boost' => false,
            'score' => 8.0,
            'security_score' => 8.0,
            'maintenance_score' => 8.0,
            'connectivity_score' => 8.0,
            'lifestyle_score' => 8.0,
            'investment_score' => 8.0,
            'latitude' => $row['latitude'] ? (string) $row['latitude'] : null,
            'longitude' => $row['longitude'] ? (string) $row['longitude'] : null,
            'cover_image' => $safeImage ? $imageUrl : null,
            'gallery_images' => $safeImage ? [$imageUrl] : [],
            'rera_number' => trim((string) ($row['rera_id'] ?? '')) ?: null,
            'source_name' => 'SocietyFlats Gurgaon master workbook',
            'source_url' => trim((string) ($row['rera_search_url'] ?: $row['google_maps_search_url'] ?: '')) ?: null,
            'data_quality' => Str::limit("Workbook import | {$verificationStatus} | confidence {$confidence} | image {$imageStatusText} | {$notes}", 255, ''),
            'imported_at' => now(),
        ];
    }

    private function sectorFromText(string $text): ?string
    {
        if (preg_match('/Sector[\s\/-]*[0-9A-Za-z]+/i', $text, $matches)) {
            return trim(str_replace('/', '', $matches[0]));
        }

        return null;
    }

    /**
     * @param array<string, mixed> $row
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
