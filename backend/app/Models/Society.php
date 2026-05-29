<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Society extends Model {
  protected $fillable=['name','slug','builder','sector','locality','address','description','year_built','total_towers','total_units','maintenance_charges','rent_range','buy_range','rental_yield','average_rent','average_sale_price','price_per_sqft','score','security_score','maintenance_score','connectivity_score','lifestyle_score','investment_score','amenities','nearby_schools','nearby_metro','nearby_hospitals','nearby_office_hubs','meta_title','meta_description','faq','status','featured','show_in_hero','search_boost','latitude','longitude','rwa_contact','cover_image','gallery_images','brochure_name','rera_number','source_name','source_url','data_quality','imported_at'];
  protected $casts=['featured'=>'boolean','show_in_hero'=>'boolean','search_boost'=>'boolean','amenities'=>'array','gallery_images'=>'array','imported_at'=>'datetime','score'=>'decimal:1','security_score'=>'decimal:1','maintenance_score'=>'decimal:1','connectivity_score'=>'decimal:1','lifestyle_score'=>'decimal:1','investment_score'=>'decimal:1'];
  public function properties(): HasMany { return $this->hasMany(Property::class); }
}
