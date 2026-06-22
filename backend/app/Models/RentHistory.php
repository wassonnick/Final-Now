<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RentHistory extends Model
{
    protected $fillable = ['society_id', 'recorded_on', 'bhk', 'min_rent', 'median_rent', 'max_rent', 'sample_size', 'source_name', 'source_url', 'confidence_score', 'status', 'notes'];

    protected $casts = ['recorded_on' => 'date', 'bhk' => 'integer', 'min_rent' => 'integer', 'median_rent' => 'integer', 'max_rent' => 'integer', 'sample_size' => 'integer', 'confidence_score' => 'integer'];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }
}
