<?php

namespace App\Services\VerifiedSocietyImporter;

use App\Models\Society;
use App\Models\VerifiedSocietyFieldSource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SocietyImportProfileApplier
{
    public function __construct(private SocietyImportNormalizer $normalizer) {}

    public function apply(Society $society, array $fields, bool $enforceImporterDraft = true): array
    {
        $updates = [];
        $appliedFields = [];

        foreach ($fields as $field => $value) {
            if ($this->empty($value)) continue;
            $column = $this->normalizer->societyColumn((string) $field);
            if (!$column) continue;
            if ($column === 'image_reference_url' && $society->image_approved_by_admin) continue;
            if ($this->isScore($column) && (!$this->validScore($value))) continue;
            if ($column === 'slug') {
                $value=Str::slug((string)$value);
                if ($value==='' || Society::where('slug',$value)->whereKeyNot($society->id)->exists()) continue;
            }

            $updates[$column] = $this->databaseValue($column, $value);
            $appliedFields[] = (string) $field;
        }

        $rentRange = $this->range($fields['rent_min'] ?? null, $fields['rent_max'] ?? null);
        if ($rentRange !== null) {
            $updates['rent_range'] = $rentRange;
            $appliedFields = [...$appliedFields, 'rent_min', 'rent_max'];
        }

        $buyRange = $this->range($fields['resale_min'] ?? null, $fields['resale_max'] ?? null);
        if ($buyRange !== null) {
            $updates['buy_range'] = $buyRange;
            $appliedFields = [...$appliedFields, 'resale_min', 'resale_max'];
        }

        if ($enforceImporterDraft) {
            $updates += [
                'status' => 'Draft',
                'verification_status' => 'Needs Review',
                'is_published' => false,
                'published_at' => null,
            ];
        } else {
            $updates['verification_status'] = 'Needs Review';
        }

        if ($updates !== []) $society->update($updates);

        return array_values(array_unique(array_filter($appliedFields)));
    }

    public function applyFieldSource(VerifiedSocietyFieldSource $field): array
    {
        $society = Society::findOrFail($field->society_id);
        $value = $this->decodedValue($field->normalized_value);
        $enforceDraft = $society->source_name === 'Verified Society Importer V2';

        return $this->apply($society, [$field->field_name => $value], $enforceDraft);
    }

    public function applyHighConfidence(Society $society, int $minimum = 80): array
    {
        if ($society->source_name !== 'Verified Society Importer V2') {
            throw new \InvalidArgumentException('High-confidence bulk apply is limited to V2 importer drafts.');
        }

        return DB::transaction(function () use ($society, $minimum) {
            $candidates = VerifiedSocietyFieldSource::query()
                ->where('society_id', $society->id)
                ->where('admin_rejected', false)
                ->where('confidence_score', '>=', $minimum)
                ->orderByDesc('confidence_score')
                ->orderByDesc('id')
                ->get()
                ->unique('field_name');

            $fields = [];
            foreach ($candidates as $candidate) {
                if (!$this->normalizer->societyColumn($candidate->field_name)) continue;
                VerifiedSocietyFieldSource::where('society_id', $society->id)
                    ->where('field_name', $candidate->field_name)
                    ->update(['is_selected_value' => false]);
                $candidate->update([
                    'is_selected_value' => true,
                    'admin_approved' => true,
                    'needs_review' => false,
                ]);
                $fields[$candidate->field_name] = $this->decodedValue($candidate->normalized_value);
            }

            return $this->apply($society, $fields, true);
        });
    }

    public function mappedFields(): array
    {
        return [
            'name', 'display_name', 'slug', 'builder_name', 'city', 'state', 'sector', 'locality', 'address',
            'rera_number', 'project_status', 'possession_status', 'possession_date', 'property_type',
            'configurations', 'land_area', 'tower_count', 'unit_count', 'latitude', 'longitude',
            'google_place_id', 'google_maps_url', 'builder_url', 'official_project_url', 'developer_url',
            'brochure_url', 'description', 'amenities', 'nearby_schools', 'nearby_hospitals',
            'nearby_metro', 'nearby_office_hubs', 'rent_range', 'buy_range', 'rent_min', 'rent_max', 'resale_min', 'resale_max',
            'average_rent', 'average_sale_price', 'price_per_sqft', 'rental_yield',
            'maintenance_charges', 'score', 'security_score', 'maintenance_score', 'connectivity_score',
            'lifestyle_score', 'investment_score', 'image_reference_url', 'cover_image_url', 'source_url',
            'rera_search_url', 'meta_title', 'meta_description',
        ];
    }

    private function databaseValue(string $column, mixed $value): mixed
    {
        if (in_array($column, ['amenities', 'nearby_schools', 'nearby_metro', 'nearby_hospitals', 'nearby_office_hubs'], true)) {
            if (is_array($value)) return array_values(array_filter(array_map('strval', $value)));
        }
        return is_scalar($value) ? (string) $value : $value;
    }

    private function decodedValue(?string $value): mixed
    {
        $decoded = json_decode((string) $value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }

    private function range(mixed $minimum, mixed $maximum): ?string
    {
        $values = array_values(array_filter([$minimum, $maximum], fn ($value) => !$this->empty($value)));
        return $values === [] ? null : implode(' - ', array_map('strval', $values));
    }

    private function isScore(string $column): bool
    {
        return $column === 'score' || str_ends_with($column, '_score');
    }

    private function validScore(mixed $value): bool
    {
        return is_numeric($value) && (float) $value >= 0 && (float) $value <= 10;
    }

    private function empty(mixed $value): bool
    {
        return $value === null || $value === '' || $value === [];
    }
}
