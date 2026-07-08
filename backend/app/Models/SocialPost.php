<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialPost extends Model
{
    protected $fillable = [
        'platform',
        'post_type',
        'title',
        'hook',
        'caption',
        'cta',
        'hashtags',
        'creative_prompt',
        'image_prompt',
        'image_style',
        'carousel_slides',
        'reel_script',
        'source_type',
        'source_id',
        'risk_level',
        'status',
        'scheduled_at',
        'posted_at',
        'ai_model',
        'ai_image_model',
        'ai_prompt_version',
    ];

    protected $casts = [
        'hashtags' => 'array',
        'carousel_slides' => 'array',
        'scheduled_at' => 'datetime',
        'posted_at' => 'datetime',
    ];

    public function assets(): HasMany
    {
        return $this->hasMany(SocialPostAsset::class);
    }
}
