<?php

namespace App\Services\VerifiedSocietyImporter;

use App\Models\Society;
use App\Models\VerifiedSocietyFieldSource;
use App\Models\VerifiedSocietyImportSource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SocietyImportDraftGenerator
{
    private const MARKET_FIELDS = [
        'rent_range', 'buy_range', 'average_rent', 'average_sale_price',
        'price_per_sqft', 'rental_yield', 'maintenance_charges',
    ];
    private const MARKET_VALUE_FIELDS = [
        'rent_range', 'buy_range', 'average_rent', 'average_sale_price',
        'price_per_sqft', 'rental_yield',
    ];

    public function __construct(
        private SocietyImportSourceRecorder $recorder,
        private SocietyImportProfileApplier $profileApplier,
    ) {}

    public function description(Society $society, bool $replace = false): array
    {
        $this->assertImporterDraft($society);
        if (! $replace && filled($society->description)) {
            return ['applied_fields' => [], 'message' => 'Description already exists; enable replace to regenerate it.'];
        }

        $location = $this->location($society);
        $sentences = [trim($society->name.' is located in '.$location.'.')];
        if (filled($society->builder)) $sentences[] = 'The recorded developer is '.$society->builder.'.';
        if (filled($society->project_status)) $sentences[] = 'The recorded project status is '.$society->project_status.'.';
        if (filled($society->possession_date)) $sentences[] = 'The recorded possession information is '.$society->possession_date.'.';
        if (filled($society->rera_number)) $sentences[] = 'The imported RERA registration number is '.$society->rera_number.'.';
        if ($amenities = $this->values($society->amenities)) $sentences[] = 'Recorded amenities include '.implode(', ', $amenities).'.';
        if ($schools = $this->values($society->nearby_schools)) $sentences[] = 'Recorded nearby schools include '.implode(', ', $schools).'.';
        if ($hospitals = $this->values($society->nearby_hospitals)) $sentences[] = 'Recorded nearby hospitals include '.implode(', ', $hospitals).'.';
        if ($metro = $this->values($society->nearby_metro)) $sentences[] = 'Recorded metro or commute notes include '.implode(', ', $metro).'.';
        if ($offices = $this->values($society->nearby_office_hubs)) $sentences[] = 'Recorded office-hub access includes '.implode(', ', $offices).'.';
        if (filled($society->rent_range)) $sentences[] = 'The imported rent range is '.$society->rent_range.'.';
        if (filled($society->buy_range)) $sentences[] = 'The imported resale range is '.$society->buy_range.'.';

        $description = implode(' ', $sentences);
        $this->recordAndApply($society, ['description' => $description], 'internal_generator', 'Source-backed description generator', 65);

        return ['applied_fields' => ['description'], 'description' => $description, 'message' => 'Source-backed draft description generated for review.'];
    }

    public function seo(Society $society, bool $replace = false): array
    {
        $this->assertImporterDraft($society);
        $fields = [];
        $place = filled($society->sector) ? $society->sector.' Gurgaon' : (filled($society->locality) ? $society->locality.' Gurgaon' : 'Gurgaon');
        if ($replace || blank($society->meta_title)) {
            $fields['meta_title'] = Str::limit($society->name.' '.$place.' | Society Details, Amenities & Location', 255, '');
        }
        if ($replace || blank($society->meta_description)) {
            $market = collect(self::MARKET_VALUE_FIELDS)->contains(fn ($field) => filled($society->{$field}));
            $locationLabel = $this->validCoordinates($society) || filled($society->google_maps_url)
                ? 'verified location'
                : 'available location details';
            $availability = $market
                ? $locationLabel.', available project details and imported rental/resale information'
                : $locationLabel.', available project details and upcoming verified rental/resale listings';
            $fields['meta_description'] = Str::limit('Explore '.$society->name.' in '.$place.' with '.$availability.' on SocietyFlats.', 1000, '');
        }
        if ($fields === []) return ['applied_fields' => [], 'message' => 'SEO fields already exist; enable replace to regenerate them.'];

        $this->recordAndApply($society, $fields, 'internal_generator', 'Source-backed SEO generator', 65);
        return ['applied_fields' => array_keys($fields), 'data' => $fields, 'message' => 'Draft SEO metadata generated for review.'];
    }

    public function scores(Society $society, bool $replace = false): array
    {
        $this->assertImporterDraft($society);
        $hasCoordinates = $this->validCoordinates($society);
        $hasAmenities = count($this->values($society->amenities)) >= 5;
        $hasSecurity = collect($this->values($society->amenities))->contains(fn ($item) => in_array($item, ['24x7 Security','CCTV','Power Backup'], true));
        $hasMarket = collect(self::MARKET_VALUE_FIELDS)->contains(fn ($field) => filled($society->{$field}));

        $overall = 7.0
            + ($hasCoordinates ? 0.3 : 0)
            + (filled($society->google_maps_url) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_schools) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_hospitals) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_office_hubs) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_metro) ? 0.2 : 0)
            + ($hasAmenities ? 0.2 : 0)
            + (filled($society->rera_number) ? 0.2 : 0)
            + (filled($society->official_project_url) || filled($society->official_developer_url) ? 0.2 : 0);
        $connectivity = 7.0
            + ($hasCoordinates ? 0.3 : 0)
            + (filled($society->google_maps_url) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_schools) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_hospitals) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_office_hubs) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_metro) ? 0.2 : 0);
        $lifestyle = 7.0 + ($hasAmenities ? 0.2 : 0)
            + ($this->hasValues($society->nearby_schools) ? 0.2 : 0)
            + ($this->hasValues($society->nearby_hospitals) ? 0.2 : 0);

        $candidates = [
            'score' => min(9.2, round($overall, 1)),
            'connectivity_score' => min(9.2, round($connectivity, 1)),
            'lifestyle_score' => min(9.2, round($lifestyle, 1)),
            'security_score' => $hasSecurity ? 7.5 : null,
            'maintenance_score' => filled($society->maintenance_charges) ? 7.0 : null,
            'investment_score' => $hasMarket ? 7.0 : null,
        ];
        $fields = array_filter($candidates, function ($value, $field) use ($society, $replace) {
            if ($value === null) return false;
            return $replace || blank($society->{$field}) || (float) $society->{$field} === 0.0;
        }, ARRAY_FILTER_USE_BOTH);
        if ($fields === []) return ['applied_fields' => [], 'message' => 'No blank score fields were eligible for generation.'];

        $this->recordAndApply($society, $fields, 'importer_rule_engine', 'Deterministic importer score rules', 65);
        return ['applied_fields' => array_keys($fields), 'data' => $fields, 'message' => 'Deterministic draft scores generated for review.'];
    }

    public function applyMarketData(Society $society): array
    {
        $this->assertImporterDraft($society);
        return DB::transaction(function () use ($society) {
            $candidates = VerifiedSocietyFieldSource::query()
                ->where('society_id', $society->id)
                ->whereIn('field_name', self::MARKET_FIELDS)
                ->where('admin_rejected', false)
                ->orderByDesc('confidence_score')->orderByDesc('id')->get()->unique('field_name');
            $fields = [];
            foreach ($candidates as $candidate) {
                $decoded = json_decode((string) $candidate->normalized_value, true);
                $fields[$candidate->field_name] = json_last_error() === JSON_ERROR_NONE ? $decoded : $candidate->normalized_value;
                VerifiedSocietyFieldSource::where('society_id', $society->id)->where('field_name', $candidate->field_name)->update(['is_selected_value' => false]);
                $candidate->update(['is_selected_value' => true, 'needs_review' => false, 'admin_approved' => true]);
            }
            $applied = $this->profileApplier->apply($society, $fields, true);
            return ['applied_fields' => $applied, 'message' => count($applied).' market fields approved and applied; society remains unpublished.'];
        });
    }

    private function recordAndApply(Society $society, array $fields, string $sourceType, string $sourceName, int $confidence): void
    {
        DB::transaction(function () use ($society, $fields, $sourceType, $sourceName, $confidence) {
            $jobId = $this->jobId($society);
            $sourceUrl = $society->source_url ?: $society->official_project_url;
            $this->recorder->source([
                'import_job_id' => $jobId, 'society_id' => $society->id, 'source_type' => $sourceType,
                'source_name' => $sourceName, 'source_url' => $sourceUrl, 'confidence_score' => $confidence,
                'raw_response' => ['input_fields' => array_keys(array_filter($society->toArray(), fn ($value) => filled($value)))],
            ]);
            foreach ($fields as $field => $value) {
                VerifiedSocietyFieldSource::where('society_id', $society->id)->where('field_name', $field)->update(['is_selected_value' => false]);
                $this->recorder->field($society->id, $jobId, $field, $value, $sourceType, $sourceName, $sourceUrl, $confidence, true);
            }
            $this->profileApplier->apply($society, $fields, true);
        });
    }

    private function jobId(Society $society): int
    {
        $jobId = VerifiedSocietyImportSource::where('society_id', $society->id)->whereNotNull('import_job_id')->latest()->value('import_job_id');
        if (! $jobId) $jobId = VerifiedSocietyFieldSource::where('society_id', $society->id)->whereNotNull('import_job_id')->latest()->value('import_job_id');
        if (! $jobId) throw new \InvalidArgumentException('No verified importer job is linked to this society.');
        return (int) $jobId;
    }

    private function assertImporterDraft(Society $society): void
    {
        if ($society->source_name !== 'Verified Society Importer V2') throw new \InvalidArgumentException('This action is limited to Verified Importer drafts.');
    }

    private function location(Society $society): string
    {
        return implode(', ', array_filter([$society->sector ?: $society->locality, $society->city ?: 'Gurugram']));
    }

    private function values(mixed $value): array
    {
        if (is_array($value)) return array_values(array_filter(array_map('strval', $value)));
        return array_values(array_filter(array_map('trim', preg_split('/[,;|\r\n]+/', (string) $value) ?: [])));
    }

    private function hasValues(mixed $value): bool
    {
        return $this->values($value) !== [];
    }

    private function validCoordinates(Society $society): bool
    {
        if (! is_numeric($society->latitude) || ! is_numeric($society->longitude)) return false;
        $latitude=(float)$society->latitude;$longitude=(float)$society->longitude;
        return !($latitude===0.0&&$longitude===0.0)&&$latitude>=-90&&$latitude<=90&&$longitude>=-180&&$longitude<=180;
    }
}
