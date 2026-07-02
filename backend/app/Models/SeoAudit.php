<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class SeoAudit extends Model
{
    protected $fillable=['seo_page_id','score','status','breakdown','issues','checked_at'];
    protected $casts=['breakdown'=>'array','issues'=>'array','checked_at'=>'datetime'];
    public function page(): BelongsTo { return $this->belongsTo(SeoPage::class,'seo_page_id'); }
}
