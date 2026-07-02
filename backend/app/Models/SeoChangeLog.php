<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SeoChangeLog extends Model
{
    public $timestamps=false;
    protected $fillable=['seo_page_id','society_seo_content_id','action','actor','before_content','after_content','ai_model','metadata','created_at'];
    protected $casts=['before_content'=>'array','after_content'=>'array','metadata'=>'array','created_at'=>'datetime'];
}
