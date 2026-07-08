<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialPostAsset extends Model
{
    protected $fillable = [
        'social_post_id',
        'asset_type',
        'platform',
        'image_prompt',
        'revised_prompt',
        'storage_disk',
        'file_path',
        'public_url',
        'mime_type',
        'width',
        'height',
        'status',
        'risk_level',
        'ai_model',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(SocialPost::class, 'social_post_id');
    }
}
