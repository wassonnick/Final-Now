<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SeoReport extends Model
{
    protected $fillable=['period','period_start','period_end','summary','status','generated_at'];
    protected $casts=['period_start'=>'date','period_end'=>'date','summary'=>'array','generated_at'=>'datetime'];
}
