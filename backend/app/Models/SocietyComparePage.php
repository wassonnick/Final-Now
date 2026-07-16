<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocietyComparePage extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_NEEDS_REVIEW = 'needs_review';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_STALE = 'stale';

    protected $fillable = [
        'slug',
        'title',
        'meta_title',
        'meta_description',
        'h1',
        'society_a_id',
        'society_b_id',
        'society_c_id',
        'comparison_type',
        'city',
        'sector_cluster',
        'intro',
        'comparison_summary',
        'best_for_json',
        'comparison_table_json',
        'society_summaries_json',
        'recommendation_copy',
        'faq_json',
        'internal_links_json',
        'score',
        'content_quality_score',
        'status',
        'generated_by',
        'ai_model',
        'reviewed_by',
        'reviewed_at',
        'published_at',
        'stale_reason',
    ];

    protected $casts = [
        'best_for_json' => 'array',
        'comparison_table_json' => 'array',
        'society_summaries_json' => 'array',
        'faq_json' => 'array',
        'internal_links_json' => 'array',
        'score' => 'decimal:1',
        'content_quality_score' => 'decimal:1',
        'reviewed_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function societyA(): BelongsTo
    {
        return $this->belongsTo(Society::class, 'society_a_id');
    }

    public function societyB(): BelongsTo
    {
        return $this->belongsTo(Society::class, 'society_b_id');
    }

    public function societyC(): BelongsTo
    {
        return $this->belongsTo(Society::class, 'society_c_id');
    }

    public function societies()
    {
        return collect([$this->societyA, $this->societyB, $this->societyC])->filter();
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED)->whereNotNull('published_at');
    }
}
