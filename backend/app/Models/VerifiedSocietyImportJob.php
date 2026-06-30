<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VerifiedSocietyImportJob extends Model
{
    protected $fillable = ['job_type', 'input_payload', 'input_file_name', 'input_file_path', 'status', 'total_rows', 'processed_rows', 'created_societies_count', 'updated_societies_count', 'skipped_count', 'failed_count', 'overall_confidence', 'error_log', 'summary', 'created_by'];
    protected $casts = ['input_payload' => 'array', 'error_log' => 'array', 'summary' => 'array'];

    public function rows(): HasMany { return $this->hasMany(VerifiedSocietyImportRow::class, 'import_job_id'); }
    public function sources(): HasMany { return $this->hasMany(VerifiedSocietyImportSource::class, 'import_job_id'); }
    public function fieldSources(): HasMany { return $this->hasMany(VerifiedSocietyFieldSource::class, 'import_job_id'); }
    public function images(): HasMany { return $this->hasMany(VerifiedSocietyImportImage::class, 'import_job_id'); }
}
