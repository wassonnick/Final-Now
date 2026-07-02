<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class SeoSearchConsoleMetric extends Model
{
    protected $fillable=['seo_page_id','metric_date','page_url','query','clicks','impressions','ctr','position','metadata'];
    protected $casts=['metric_date'=>'date','ctr'=>'decimal:5','position'=>'decimal:2','metadata'=>'array'];
    public function page(): BelongsTo { return $this->belongsTo(SeoPage::class,'seo_page_id'); }
}
