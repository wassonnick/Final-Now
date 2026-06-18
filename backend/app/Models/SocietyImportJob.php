<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocietyImportJob extends Model
{
    protected $fillable = [
        'type',
        'input',
        'source',
        'status',
        'logs',
        'result_society_id',
        'imported_count',
        'failed_count',
        'results',
        'triggered_by',
        'completed_at',
    ];

    protected $casts = [
        'logs' => 'array',
        'results' => 'array',
        'completed_at' => 'datetime',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class, 'result_society_id');
    }
}
