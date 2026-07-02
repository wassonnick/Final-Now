<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class SeoTask extends Model
{
    protected $fillable=['seo_page_id','task_type','priority','status','title','description','source','metadata','due_at','resolved_at'];
    protected $casts=['metadata'=>'array','due_at'=>'datetime','resolved_at'=>'datetime'];
    public function page(): BelongsTo { return $this->belongsTo(SeoPage::class,'seo_page_id'); }
}
