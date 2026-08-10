<?php

namespace App\Models;

use App\Observers\SocietyObserver;
use App\Services\Ncr\NcrCityLaunchPolicy;
use App\Services\SocietyComparePageGenerator;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[ObservedBy(SocietyObserver::class)]
class Society extends Model
{
    protected $fillable = ['region_id', 'city_id', 'zone_id', 'locality_id', 'micro_market', 'authority', 'pincode', 'name', 'slug', 'builder', 'sector', 'locality', 'city', 'state', 'society_type', 'address', 'description', 'project_status', 'possession_date', 'configuration', 'project_area', 'unit_size_range', 'year_built', 'total_towers', 'total_units', 'maintenance_charges', 'rent_range', 'buy_range', 'rental_yield', 'average_rent', 'average_sale_price', 'price_per_sqft', 'score', 'security_score', 'maintenance_score', 'connectivity_score', 'lifestyle_score', 'investment_score', 'amenities', 'nearby_schools', 'nearby_metro', 'nearby_hospitals', 'nearby_office_hubs', 'meta_title', 'meta_description', 'faq', 'status', 'verification_status', 'is_published', 'published_at', 'featured', 'show_in_hero', 'search_boost', 'latitude', 'longitude', 'place_id', 'rwa_contact', 'cover_image', 'gallery_images', 'approved_gallery_image_urls', 'image_reference_url', 'image_url', 'image_status', 'image_approved_by_admin', 'image_alt_text', 'image_credit', 'image_license_notes', 'brochure_name', 'rera_number', 'rera_status', 'source_name', 'source_url', 'official_source_url', 'official_project_url', 'official_developer_url', 'official_brochure_url', 'official_floor_plan_url', 'official_gallery_url', 'official_source_status', 'official_source_last_checked_at', 'official_source_notes', 'fields_to_verify', 'rera_search_url', 'official_rera_source_url', 'google_maps_url', 'source_confidence_score', 'data_quality', 'imported_at', 'field_sources', 'score_breakdown', 'image_candidates', 'image_photo_reference'];

    protected $casts = ['featured' => 'boolean', 'show_in_hero' => 'boolean', 'search_boost' => 'boolean', 'is_published' => 'boolean', 'image_approved_by_admin' => 'boolean', 'amenities' => 'array', 'gallery_images' => 'array', 'approved_gallery_image_urls' => 'array', 'fields_to_verify' => 'array', 'faq' => 'array', 'nearby_office_hubs' => 'array', 'nearby_hospitals' => 'array', 'nearby_metro' => 'array', 'nearby_schools' => 'array', 'imported_at' => 'datetime', 'published_at' => 'datetime', 'official_source_last_checked_at' => 'datetime', 'source_confidence_score' => 'integer', 'score' => 'decimal:1', 'security_score' => 'decimal:1', 'maintenance_score' => 'decimal:1', 'connectivity_score' => 'decimal:1', 'lifestyle_score' => 'decimal:1', 'investment_score' => 'decimal:1', 'field_sources' => 'array', 'score_breakdown' => 'array', 'image_candidates' => 'array'];

    protected static function booted(): void
    {
        static::updated(function (Society $society): void {
            $materialFields = [
                'is_published',
                'status',
                'name',
                'slug',
                'builder',
                'sector',
                'locality',
                'city',
                'project_status',
                'amenities',
                'nearby_schools',
                'nearby_metro',
                'nearby_hospitals',
                'nearby_office_hubs',
                'rent_range',
                'buy_range',
                'score',
                'connectivity_score',
                'lifestyle_score',
            ];

            if (! $society->wasChanged($materialFields)) {
                return;
            }

            $reason = (! $society->is_published || ! in_array($society->status, ['Verified', 'Premium'], true))
                ? 'One of the societies became unpublished or non-public.'
                : 'Compared society data changed and needs admin review.';

            app(SocietyComparePageGenerator::class)->markStaleForSociety($society, $reason);
        });
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /**
     * Hides inventory belonging to a city that is not live yet.
     *
     * Publishing was gated; reading never was. A society published into Delhi before Delhi
     * launched stayed in the public catalogue, so a search headed "Gurgaon" returned
     * Paschim Vihar flats. Matched on the city NAME as well as the id, because legacy rows
     * carry a city string with no city_id and would otherwise slip through.
     */
    public function scopeInLiveCities($query)
    {
        $hidden = app(NcrCityLaunchPolicy::class)->hiddenCities();

        if ($hidden['ids'] === [] && $hidden['names'] === []) {
            return $query;
        }

        return $query->where(function ($outer) use ($hidden) {
            $outer->where(function ($q) use ($hidden) {
                // Unmapped rows are Gurgaon by history and must never be hidden.
                $q->whereNull('city_id')->orWhereNotIn('city_id', $hidden['ids'] ?: [0]);
            })->when($hidden['names'] !== [], fn ($q) => $q->where(function ($inner) use ($hidden) {
                $inner->whereNull('city')->orWhereNotIn('city', $hidden['names']);
            }));
        });
    }

    public function cityRecord(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function localityRecord(): BelongsTo
    {
        return $this->belongsTo(Locality::class, 'locality_id');
    }

    public function comparePagesA(): HasMany
    {
        return $this->hasMany(SocietyComparePage::class, 'society_a_id');
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

    public function intelligenceProfile(): HasOne
    {
        return $this->hasOne(SocietyIntelligenceProfile::class);
    }

    public function intelligenceCorrections(): HasMany
    {
        return $this->hasMany(IntelligenceCorrection::class);
    }
}
