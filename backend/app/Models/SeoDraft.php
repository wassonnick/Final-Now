<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class SeoDraft extends Model
{
    protected $fillable=['seo_page_id','status','current_version','suggested_version','reason','confidence_score','data_sources','risk_warnings','generated_by','ai_model','reviewed_by','reviewed_at','published_at'];
    protected $casts=['current_version'=>'array','suggested_version'=>'array','data_sources'=>'array','risk_warnings'=>'array','reviewed_at'=>'datetime','published_at'=>'datetime'];
    public function page(): BelongsTo { return $this->belongsTo(SeoPage::class,'seo_page_id'); }
}
