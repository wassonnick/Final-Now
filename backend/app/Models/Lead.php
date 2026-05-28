<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Lead extends Model {
  protected $fillable=['property_id','society_id','name','phone','email','budget','source','status','assigned_to','notes'];
  public function property(): BelongsTo { return $this->belongsTo(Property::class); }
  public function society(): BelongsTo { return $this->belongsTo(Society::class); }
}
