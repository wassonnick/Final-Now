<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Society extends Model
{
    protected $fillable = ['name', 'slug', 'builder', 'sector', 'locality', 'city', 'state', 'society_type', 'address', 'description', 'project_status', 'possession_date', 'configuration', 'project_area', 'unit_size_range', 'year_built', 'total_towers', 'total_units', 'maintenance_charges', 'rent_range', 'buy_range', 'rental_yield', 'average_rent', 'average_sale_price', 'price_per_sqft', 'score', 'security_score', 'maintenance_score', 'connectivity_score', 'lifestyle_score', 'investment_score', 'amenities', 'nearby_schools', 'nearby_metro', 'nearby_hospitals', 'nearby_office_hubs', 'meta_title', 'meta_description', 'faq', 'status', 'verification_status', 'is_published', 'published_at', 'featured', 'show_in_hero', 'search_boost', 'latitude', 'longitude', 'place_id', 'rwa_contact', 'cover_image', 'gallery_images', 'approved_gallery_image_urls', 'image_reference_url', 'image_url', 'image_status', 'image_approved_by_admin', 'image_alt_text', 'image_credit', 'image_license_notes', 'brochure_name', 'rera_number', 'rera_status', 'source_name', 'source_url', 'official_source_url', 'official_project_url', 'official_developer_url', 'official_brochure_url', 'official_floor_plan_url', 'official_gallery_url', 'official_source_status', 'official_source_last_checked_at', 'official_source_notes', 'fields_to_verify', 'rera_search_url', 'official_rera_source_url', 'google_maps_url', 'source_confidence_score', 'data_quality', 'imported_at', 'field_sources', 'score_breakdown', 'image_candidates', 'image_photo_reference'];

    protected $casts = ['featured' => 'boolean', 'show_in_hero' => 'boolean', 'search_boost' => 'boolean', 'is_published' => 'boolean', 'image_approved_by_admin' => 'boolean', 'amenities' => 'array', 'gallery_images' => 'array', 'approved_gallery_image_urls' => 'array', 'fields_to_verify' => 'array', 'faq' => 'array', 'nearby_office_hubs' => 'array', 'nearby_hospitals' => 'array', 'nearby_metro' => 'array', 'nearby_schools' => 'array', 'imported_at' => 'datetime', 'published_at' => 'datetime', 'official_source_last_checked_at' => 'datetime', 'source_confidence_score' => 'integer', 'score' => 'decimal:1', 'security_score' => 'decimal:1', 'maintenance_score' => 'decimal:1', 'connectivity_score' => 'decimal:1', 'lifestyle_score' => 'decimal:1', 'investment_score' => 'decimal:1', 'field_sources' => 'array', 'score_breakdown' => 'array', 'image_candidates' => 'array'];

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function rentHistory(): HasMany
    {
        return $this->hasMany(RentHistory::class);
    }

    public function builderClaims(): HasMany
    {
        return $this->hasMany(BuilderClaim::class);
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(SocietyAnnouncement::class);
    }

    public function rwaThreads(): HasMany
    {
        return $this->hasMany(RwaThread::class);
    }

    public function verifiedImportImages(): HasMany
    {
        return $this->hasMany(VerifiedSocietyImportImage::class);
    }

    public function seoContent(): HasOne
    {
        return $this->hasOne(SocietySeoContent::class);
    }
}
