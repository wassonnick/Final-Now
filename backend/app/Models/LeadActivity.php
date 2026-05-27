<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadActivity extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'lead_activities';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['lead_id', 'activity_type', 'description', 'performed_by', 'metadata'];

    protected $casts = ['metadata' => 'array'];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
