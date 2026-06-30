<?php

namespace App\Services\VerifiedSocietyImporter;

use App\Models\VerifiedSocietyFieldSource;
use App\Models\VerifiedSocietyImportSource;

class SocietyImportSourceRecorder
{
    public function __construct(private SocietyImportConfidenceScorer $scorer) {}

    public function source(array $data): VerifiedSocietyImportSource
    {
        return VerifiedSocietyImportSource::create($data + [
            'source_priority' => $this->scorer->priority($data['source_type']),
            'fetched_at' => now(), 'status' => $data['status'] ?? 'recorded',
        ]);
    }

    public function field(int $societyId, int $jobId, string $field, mixed $value, string $sourceType, ?string $sourceName, ?string $sourceUrl, int $confidence, bool $selected = true): VerifiedSocietyFieldSource
    {
        $stored = is_array($value) ? json_encode(array_values($value), JSON_UNESCAPED_UNICODE) : (string) $value;
        return VerifiedSocietyFieldSource::create([
            'society_id'=>$societyId,'import_job_id'=>$jobId,'field_name'=>$field,'field_value'=>$stored,
            'raw_value'=>$stored,'normalized_value'=>$stored,'source_type'=>$sourceType,'source_name'=>$sourceName,
            'source_url'=>$sourceUrl,'confidence_score'=>$confidence,'is_selected_value'=>$selected,
            'needs_review'=>true,'admin_approved'=>false,'admin_rejected'=>false,
        ]);
    }
}
