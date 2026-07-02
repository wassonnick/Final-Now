<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SeoPage extends Model
{
    protected $fillable = ['page_key','page_type','entity_type','entity_id','url','title','meta_description','h1','canonical_url','is_indexable','sitemap_included','is_public','content_word_count','internal_link_count','image_alt_coverage','schema_types','metadata','freshness_at'];
    protected $casts = ['is_indexable'=>'boolean','sitemap_included'=>'boolean','is_public'=>'boolean','schema_types'=>'array','metadata'=>'array','freshness_at'=>'datetime'];

    public function audits(): HasMany { return $this->hasMany(SeoAudit::class); }
    public function latestAudit(): HasOne { return $this->hasOne(SeoAudit::class)->latestOfMany('checked_at'); }
    public function tasks(): HasMany { return $this->hasMany(SeoTask::class); }
    public function drafts(): HasMany { return $this->hasMany(SeoDraft::class); }
    public function keywords(): HasMany { return $this->hasMany(SeoKeyword::class); }
}
