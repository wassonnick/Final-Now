<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class SeoKeyword extends Model
{
    protected $fillable=['keyword','cluster_type','intent','seo_page_id','suggested_url','source','difficulty','search_volume','status','metadata'];
    protected $casts=['metadata'=>'array'];
    public function page(): BelongsTo { return $this->belongsTo(SeoPage::class,'seo_page_id'); }
}
