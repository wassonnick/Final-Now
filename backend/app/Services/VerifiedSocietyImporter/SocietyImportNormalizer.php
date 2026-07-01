<?php

namespace App\Services\VerifiedSocietyImporter;

use Illuminate\Support\Str;

class SocietyImportNormalizer
{
    public const ALIASES = [
        'name' => ['name','society_name','society name','project_name','project name'],
        'display_name' => ['display_name','display name'], 'legal_name' => ['legal_name','legal name'],
        'slug' => ['slug','seo_slug','seo slug'],
        'builder_name' => ['builder_name','builder name','builder','developer'], 'city' => ['city'], 'state' => ['state'],
        'sector' => ['sector','sector/location'], 'locality' => ['locality','location'], 'address' => ['address'],
        'rera_number' => ['rera_number','rera number','rera no','rera id'], 'rera_url' => ['rera_url','rera url'],
        'promoter_name' => ['promoter_name','promoter name'], 'rera_status' => ['rera_status','rera status'],
        'registration_date' => ['registration_date','registration date'],
        'registration_validity' => ['registration_validity','registration validity'],
        'certificate_url' => ['certificate_url','certificate url','rera certificate url'],
        'oc_cc_pcc_url' => ['oc_cc_pcc_url','oc cc pcc url','oc url','cc url','pcc url'],
        'dtcp_license_number' => ['dtcp_license_number','dtcp license number'], 'dtcp_url' => ['dtcp_url','dtcp url'],
        'project_status' => ['project_status','project status'], 'possession_status' => ['possession_status','possession status'],
        'possession_date' => ['possession_date','possession date'],
        'property_type' => ['property_type','property type'], 'configurations' => ['configurations','configuration'],
        'land_area' => ['land_area','land area'], 'tower_count' => ['tower_count','tower count','towers'],
        'unit_count' => ['unit_count','unit count','units'], 'latitude' => ['latitude','lat'],
        'longitude' => ['longitude','lng','long'], 'google_place_id' => ['google_place_id','google place id','place_id'],
        'google_maps_url' => ['google_maps_url','google maps url'], 'builder_url' => ['builder_url','builder url'],
        'developer_url' => ['developer_url','developer url'], 'official_project_url' => ['official_project_url','official project url'],
        'brochure_url' => ['brochure_url','brochure url'], 'description' => ['description','short_description','long_description','description_source_text','description source text'],
        'amenities' => ['amenities'], 'nearby_schools' => ['nearby_schools','nearby schools'],
        'nearby_hospitals' => ['nearby_hospitals','nearby hospitals'],
        'nearby_metro' => ['nearby_metro','nearby metro'], 'nearby_office_hubs' => ['nearby_office_hubs','nearby office hubs','office_hubs','office hubs'],
        'nearby_malls' => ['nearby_malls','nearby malls'], 'nearby_markets' => ['nearby_markets','nearby markets'],
        'commute_notes' => ['commute_notes','commute notes'],
        'rent_range' => ['rent_range','rent range'], 'buy_range' => ['buy_range','buy range','sale_range','sale range'],
        'rent_min' => ['rent_min','rent min'], 'rent_max' => ['rent_max','rent max'],
        'buy_min' => ['buy_min','buy min'], 'buy_max' => ['buy_max','buy max'],
        'resale_min' => ['resale_min','resale min'], 'resale_max' => ['resale_max','resale max'],
        'average_rent' => ['average_rent','average rent'], 'average_sale_price' => ['average_sale_price','average sale price'],
        'price_per_sqft' => ['price_per_sqft','price per sqft','price per sq ft'], 'rental_yield' => ['rental_yield','rental yield'],
        'maintenance_charges' => ['maintenance_charges','maintenance charges'],
        'market_notes' => ['market_notes','market notes'],
        'cover_image_url' => ['cover_image_url','cover image url','cover photo'],
        'gallery_image_urls' => ['gallery_image_urls','gallery image urls','image urls','photos'],
        'image_reference_url' => ['image_reference_url','image reference url'],
        'google_photo_references' => ['google_photo_references','google photo references','google_photo_reference','google photo reference'],
        'image_attribution' => ['image_attribution','image attribution'], 'notes' => ['notes'],
        'source_url' => ['source_url','source url','market_source_url','market source url'], 'source_type' => ['source_type','source type','market_source_type','market source type'],
        'confidence_score' => ['confidence_score','confidence score'],
        'rera_search_url' => ['rera_search_url','rera search url'],
        'meta_title' => ['meta_title','meta title','seo_title','seo title'],
        'meta_description' => ['meta_description','meta description','seo_description','seo description'],
        'score' => ['score'], 'security_score' => ['security_score','security score'],
        'maintenance_score' => ['maintenance_score','maintenance score'], 'connectivity_score' => ['connectivity_score','connectivity score'],
        'lifestyle_score' => ['lifestyle_score','lifestyle score'], 'investment_score' => ['investment_score','investment score'],
    ];

    public function mapHeaders(array $headers): array
    {
        $clean = array_map(fn ($v) => $this->header((string) $v), $headers);
        $map = [];
        foreach (self::ALIASES as $canonical => $aliases) {
            foreach ($clean as $index => $header) {
                if (in_array($header, array_map([$this, 'header'], $aliases), true)) { $map[$canonical] = $index; break; }
            }
        }
        return $map;
    }

    public function normalize(array $input): array
    {
        $out = [];
        foreach ($input as $key => $value) {
            $canonical = $this->canonicalKey((string) $key);
            $out[$canonical] = is_string($value) ? trim(strip_tags($value)) : $value;
        }
        $out['name'] = trim((string) ($out['name'] ?? $out['display_name'] ?? ''));
        $out['display_name'] = trim((string) ($out['display_name'] ?? $out['name']));
        $out['legal_name'] = trim((string) ($out['legal_name'] ?? $out['name']));
        $out['normalized_name'] = $this->normalizedName($out['name']);
        $out['city'] = $this->city((string) ($out['city'] ?? 'Gurugram'));
        $out['sector'] = $this->sector((string) ($out['sector'] ?? ''));
        $out['builder_name'] = $this->builder((string) ($out['builder_name'] ?? ''));
        $out['builder_brand'] = $this->builderBrand($out['builder_name']);
        $out['slug'] = Str::slug((string) ($out['slug'] ?? trim($out['display_name'].' '.$out['sector'].' '.$out['city'])));
        $out['amenities'] = $this->amenities($out['amenities'] ?? []);
        $out['gallery_image_urls'] = array_slice($this->list($out['gallery_image_urls'] ?? []), 0, 10);
        $out['google_photo_references'] = array_slice($this->list($out['google_photo_references'] ?? []), 0, 10);
        foreach (['nearby_schools','nearby_metro','nearby_hospitals','nearby_office_hubs'] as $nearbyField) {
            if (array_key_exists($nearbyField,$out)) $out[$nearbyField] = $this->list($out[$nearbyField]);
        }
        return $out;
    }

    public function societyAttributes(array $data): array
    {
        $rent = $data['rent_range'] ?? trim(implode(' - ', array_filter([$data['rent_min'] ?? null, $data['rent_max'] ?? null])));
        $buy = $data['buy_range'] ?? trim(implode(' - ', array_filter([$data['buy_min'] ?? $data['resale_min'] ?? null, $data['buy_max'] ?? $data['resale_max'] ?? null])));
        return array_filter([
            'name'=>$data['display_name'] ?: $data['name'], 'slug'=>$data['slug'], 'builder'=>$data['builder_name'] ?: null,
            'city'=>$data['city'], 'state'=>$data['state'] ?? 'Haryana', 'sector'=>$data['sector'] ?: null, 'locality'=>$data['locality'] ?? null, 'address'=>$data['address'] ?? null,
            'rera_number'=>$data['rera_number'] ?? null, 'rera_status'=>$data['rera_status'] ?? null,
            'official_rera_source_url'=>$data['rera_url'] ?? null, 'project_status'=>$data['project_status'] ?? null,
            'possession_date'=>$data['possession_date'] ?? ($data['possession_status'] ?? null), 'society_type'=>$data['property_type'] ?? null,
            'configuration'=>$data['configurations'] ?? null, 'project_area'=>$data['land_area'] ?? null,
            'total_towers'=>$data['tower_count'] ?? null, 'total_units'=>$data['unit_count'] ?? null,
            'latitude'=>$data['latitude'] ?? null, 'longitude'=>$data['longitude'] ?? null,
            'place_id'=>$data['google_place_id'] ?? null, 'google_maps_url'=>$data['google_maps_url'] ?? null,
            'official_project_url'=>$data['official_project_url'] ?? ($data['builder_url'] ?? null),
            'official_developer_url'=>$data['developer_url'] ?? null, 'official_brochure_url'=>$data['brochure_url'] ?? null,
            'description'=>$data['description'] ?? null, 'amenities'=>$data['amenities'] ?: null,
            'nearby_schools'=>$data['nearby_schools'] ?? null, 'nearby_hospitals'=>$data['nearby_hospitals'] ?? null,
            'nearby_metro'=>$data['nearby_metro'] ?? null, 'nearby_office_hubs'=>$data['nearby_office_hubs'] ?? null,
            'rent_range'=>$rent ?: null, 'buy_range'=>$buy ?: null,
            'average_rent'=>$data['average_rent'] ?? null, 'average_sale_price'=>$data['average_sale_price'] ?? null,
            'price_per_sqft'=>$data['price_per_sqft'] ?? null, 'rental_yield'=>$data['rental_yield'] ?? null,
            'maintenance_charges'=>$data['maintenance_charges'] ?? null,
            'score'=>$data['score'] ?? null, 'security_score'=>$data['security_score'] ?? null,
            'maintenance_score'=>$data['maintenance_score'] ?? null, 'connectivity_score'=>$data['connectivity_score'] ?? null,
            'lifestyle_score'=>$data['lifestyle_score'] ?? null, 'investment_score'=>$data['investment_score'] ?? null,
            'image_reference_url'=>$data['image_reference_url'] ?? ($data['cover_image_url'] ?? null),
            'rera_search_url'=>$data['rera_search_url'] ?? null, 'meta_title'=>$data['meta_title'] ?? null,
            'meta_description'=>$data['meta_description'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');
    }

    public function societyColumn(string $field): ?string
    {
        return ['slug'=>'slug','display_name'=>'name','name'=>'name','builder_name'=>'builder','city'=>'city','state'=>'state','sector'=>'sector','locality'=>'locality','address'=>'address','rera_number'=>'rera_number','rera_url'=>'official_rera_source_url','rera_status'=>'rera_status','project_status'=>'project_status','possession_status'=>'possession_date','possession_date'=>'possession_date','property_type'=>'society_type','configurations'=>'configuration','land_area'=>'project_area','tower_count'=>'total_towers','unit_count'=>'total_units','latitude'=>'latitude','longitude'=>'longitude','google_place_id'=>'place_id','google_maps_url'=>'google_maps_url','builder_url'=>'official_project_url','official_project_url'=>'official_project_url','developer_url'=>'official_developer_url','brochure_url'=>'official_brochure_url','description'=>'description','amenities'=>'amenities','nearby_schools'=>'nearby_schools','nearby_hospitals'=>'nearby_hospitals','nearby_metro'=>'nearby_metro','nearby_office_hubs'=>'nearby_office_hubs','rent_range'=>'rent_range','buy_range'=>'buy_range','rent_min'=>'rent_range','rent_max'=>'rent_range','buy_min'=>'buy_range','buy_max'=>'buy_range','resale_min'=>'buy_range','resale_max'=>'buy_range','average_rent'=>'average_rent','average_sale_price'=>'average_sale_price','price_per_sqft'=>'price_per_sqft','rental_yield'=>'rental_yield','maintenance_charges'=>'maintenance_charges','score'=>'score','security_score'=>'security_score','maintenance_score'=>'maintenance_score','connectivity_score'=>'connectivity_score','lifestyle_score'=>'lifestyle_score','investment_score'=>'investment_score','image_reference_url'=>'image_reference_url','cover_image_url'=>'image_reference_url','source_url'=>'source_url','rera_search_url'=>'rera_search_url','meta_title'=>'meta_title','meta_description'=>'meta_description'][$field] ?? null;
    }

    public function normalizedName(string $value): string { return trim(preg_replace('/\s+/', ' ', Str::lower(preg_replace('/\b(project|residency|apartments?|floors?|gurgaon|gurugram|sector)\b/i', ' ', $value)))); }
    private function city(string $v): string { return preg_match('/gurgaon/i', $v) ? 'Gurugram' : (trim($v) ?: 'Gurugram'); }
    private function sector(string $v): string { $v=trim($v); if (preg_match('/(?:sector|sec)[\s-]*(\d+[a-z]?)/i',$v,$m)) return 'Sector '.strtoupper($m[1]); return $v; }
    private function builder(string $v): string { return preg_replace('/^DLF\s+Ltd\.?$/i','DLF',trim($v)); }
    private function builderBrand(string $v): string { return preg_match('/\bDLF\b/i',$v) ? 'DLF' : trim($v); }
    private function amenities(mixed $value): array
    {
        $known = [
            'clubhouse'=>'Clubhouse', 'swimming pool'=>'Swimming Pool', 'pool'=>'Swimming Pool', 'gym'=>'Gym',
            'kids play area'=>'Kids Play Area', 'children play area'=>'Kids Play Area', 'tennis court'=>'Tennis Court',
            'badminton court'=>'Badminton Court', 'basketball court'=>'Basketball Court', 'jogging track'=>'Jogging Track',
            'power backup'=>'Power Backup', 'visitor parking'=>'Visitor Parking', 'pet friendly'=>'Pet Friendly',
            '24x7 security'=>'24x7 Security', '24/7 security'=>'24x7 Security', 'security'=>'24x7 Security',
            'concierge'=>'Concierge', 'cctv'=>'CCTV', 'landscaped greens'=>'Landscaped Greens',
            'senior citizen area'=>'Senior Citizen Area',
        ];
        return array_values(array_unique(array_map(function(string $amenity) use($known) {
            $key = trim(preg_replace('/[_-]+/', ' ', mb_strtolower($amenity)));
            $key = trim(preg_replace('/\s+/', ' ', $key));
            return $known[$key] ?? trim($amenity);
        }, $this->list($value))));
    }
    private function list(mixed $v): array { if (is_array($v)) return array_values(array_unique(array_filter(array_map('trim',$v)))); return array_values(array_unique(array_filter(array_map('trim',preg_split('/[,;|\r\n]+/',(string)$v) ?: [])))); }
    private function header(string $v): string { return trim(preg_replace('/\s+/', ' ', Str::lower(str_replace(['-','_'], ' ', $v)))); }
    private function canonicalKey(string $key): string { $h=$this->header($key); foreach(self::ALIASES as $c=>$aliases) if(in_array($h,array_map([$this,'header'],$aliases),true)) return $c; return Str::snake($key); }
}
