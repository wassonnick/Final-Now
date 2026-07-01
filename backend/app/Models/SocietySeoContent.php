<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocietySeoContent extends Model
{
    public const STATUSES = ['draft', 'needs_review', 'approved', 'published', 'unpublished'];
    public const GENERATORS = ['manual', 'ai', 'ai_plus_admin', 'system'];

    protected $fillable = [
        'society_id', 'seo_title', 'seo_description', 'seo_h1', 'intro_summary',
        'about_content', 'location_content', 'rent_content', 'sale_content',
        'amenities_content', 'investment_content', 'pros_json', 'cons_json',
        'best_for_json', 'nearby_highlights_json', 'faq_json',
        'internal_link_suggestions_json', 'schema_json', 'content_score',
        'keyword_score', 'uniqueness_score', 'readability_score', 'status',
        'generated_by', 'reviewed_by', 'published_at',
    ];

    protected $casts = [
        'pros_json' => 'array',
        'cons_json' => 'array',
        'best_for_json' => 'array',
        'nearby_highlights_json' => 'array',
        'faq_json' => 'array',
        'internal_link_suggestions_json' => 'array',
        'schema_json' => 'array',
        'content_score' => 'integer',
        'keyword_score' => 'integer',
        'uniqueness_score' => 'integer',
        'readability_score' => 'integer',
        'published_at' => 'datetime',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
