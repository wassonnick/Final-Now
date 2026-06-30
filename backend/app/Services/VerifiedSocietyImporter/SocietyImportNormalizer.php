<?php

namespace App\Services\VerifiedSocietyImporter;

use Illuminate\Support\Str;

class SocietyImportNormalizer
{
    public const ALIASES = [
        'name' => ['name','society_name','society name','project_name','project name'],
        'display_name' => ['display_name','display name'], 'legal_name' => ['legal_name','legal name'],
        'builder_name' => ['builder_name','builder name','builder','developer'], 'city' => ['city'],
        'sector' => ['sector','sector/location','location'], 'address' => ['address'],
        'rera_number' => ['rera_number','rera number','rera no','rera id'], 'rera_url' => ['rera_url','rera url'],
        'dtcp_license_number' => ['dtcp_license_number','dtcp license number'], 'dtcp_url' => ['dtcp_url','dtcp url'],
        'project_status' => ['project_status','project status'], 'possession_status' => ['possession_status','possession status'],
        'property_type' => ['property_type','property type'], 'configurations' => ['configurations','configuration'],
        'land_area' => ['land_area','land area'], 'tower_count' => ['tower_count','tower count','towers'],
        'unit_count' => ['unit_count','unit count','units'], 'latitude' => ['latitude','lat'],
        'longitude' => ['longitude','lng','long'], 'google_place_id' => ['google_place_id','google place id','place_id'],
        'google_maps_url' => ['google_maps_url','google maps url'], 'builder_url' => ['builder_url','builder url'],
        'brochure_url' => ['brochure_url','brochure url'], 'description' => ['description','short_description','long_description'],
        'amenities' => ['amenities'], 'nearby_schools' => ['nearby_schools','nearby schools'],
        'nearby_hospitals' => ['nearby_hospitals','nearby hospitals'], 'nearby_malls' => ['nearby_malls','nearby malls'],
        'nearby_metro' => ['nearby_metro','nearby metro'], 'rent_min' => ['rent_min','rent min'], 'rent_max' => ['rent_max','rent max'],
        'resale_min' => ['resale_min','resale min'], 'resale_max' => ['resale_max','resale max'],
        'maintenance_charges' => ['maintenance_charges','maintenance charges'],
        'cover_image_url' => ['cover_image_url','cover image url','cover photo'],
        'gallery_image_urls' => ['gallery_image_urls','gallery image urls','image urls','photos'],
        'image_attribution' => ['image_attribution','image attribution'], 'notes' => ['notes'],
        'source_url' => ['source_url','source url'], 'source_type' => ['source_type','source type'],
        'confidence_score' => ['confidence_score','confidence score'],
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
        $out['slug'] = Str::slug(trim($out['display_name'].' '.$out['sector'].' '.$out['city']));
        $out['amenities'] = $this->list($out['amenities'] ?? []);
        $out['gallery_image_urls'] = array_slice($this->list($out['gallery_image_urls'] ?? []), 0, 10);
        return $out;
    }

    public function societyAttributes(array $data): array
    {
        $rent = trim(implode(' - ', array_filter([$data['rent_min'] ?? null, $data['rent_max'] ?? null])));
        $buy = trim(implode(' - ', array_filter([$data['resale_min'] ?? null, $data['resale_max'] ?? null])));
        return array_filter([
            'name'=>$data['display_name'] ?: $data['name'], 'slug'=>$data['slug'], 'builder'=>$data['builder_name'] ?: null,
            'city'=>$data['city'], 'sector'=>$data['sector'] ?: null, 'address'=>$data['address'] ?? null,
            'rera_number'=>$data['rera_number'] ?? null, 'project_status'=>$data['project_status'] ?? null,
            'possession_date'=>$data['possession_status'] ?? null, 'society_type'=>$data['property_type'] ?? null,
            'configuration'=>$data['configurations'] ?? null, 'project_area'=>$data['land_area'] ?? null,
            'total_towers'=>$data['tower_count'] ?? null, 'total_units'=>$data['unit_count'] ?? null,
            'latitude'=>$data['latitude'] ?? null, 'longitude'=>$data['longitude'] ?? null,
            'place_id'=>$data['google_place_id'] ?? null, 'google_maps_url'=>$data['google_maps_url'] ?? null,
            'official_developer_url'=>$data['builder_url'] ?? null, 'official_brochure_url'=>$data['brochure_url'] ?? null,
            'description'=>$data['description'] ?? null, 'amenities'=>$data['amenities'] ?: null,
            'nearby_schools'=>$data['nearby_schools'] ?? null, 'nearby_hospitals'=>$data['nearby_hospitals'] ?? null,
            'nearby_metro'=>$data['nearby_metro'] ?? null, 'rent_range'=>$rent ?: null, 'buy_range'=>$buy ?: null,
            'maintenance_charges'=>$data['maintenance_charges'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');
    }

    public function societyColumn(string $field): ?string
    {
        return ['display_name'=>'name','name'=>'name','builder_name'=>'builder','city'=>'city','sector'=>'sector','address'=>'address','rera_number'=>'rera_number','project_status'=>'project_status','possession_status'=>'possession_date','property_type'=>'society_type','configurations'=>'configuration','land_area'=>'project_area','tower_count'=>'total_towers','unit_count'=>'total_units','latitude'=>'latitude','longitude'=>'longitude','google_place_id'=>'place_id','google_maps_url'=>'google_maps_url','builder_url'=>'official_developer_url','brochure_url'=>'official_brochure_url','description'=>'description','amenities'=>'amenities','nearby_schools'=>'nearby_schools','nearby_hospitals'=>'nearby_hospitals','nearby_metro'=>'nearby_metro','maintenance_charges'=>'maintenance_charges'][$field] ?? null;
    }

    public function normalizedName(string $value): string { return trim(preg_replace('/\s+/', ' ', Str::lower(preg_replace('/\b(project|residency|apartments?|floors?|gurgaon|gurugram|sector)\b/i', ' ', $value)))); }
    private function city(string $v): string { return preg_match('/gurgaon/i', $v) ? 'Gurugram' : (trim($v) ?: 'Gurugram'); }
    private function sector(string $v): string { $v=trim($v); if (preg_match('/(?:sector|sec)[\s-]*(\d+[a-z]?)/i',$v,$m)) return 'Sector '.strtoupper($m[1]); return $v; }
    private function builder(string $v): string { return preg_replace('/^DLF\s+Ltd\.?$/i','DLF',trim($v)); }
    private function builderBrand(string $v): string { return preg_match('/\bDLF\b/i',$v) ? 'DLF' : trim($v); }
    private function list(mixed $v): array { if (is_array($v)) return array_values(array_unique(array_filter(array_map('trim',$v)))); return array_values(array_unique(array_filter(array_map('trim',preg_split('/[,;|\r\n]+/',(string)$v) ?: [])))); }
    private function header(string $v): string { return trim(preg_replace('/\s+/', ' ', Str::lower(str_replace(['-','_'], ' ', $v)))); }
    private function canonicalKey(string $key): string { $h=$this->header($key); foreach(self::ALIASES as $c=>$aliases) if(in_array($h,array_map([$this,'header'],$aliases),true)) return $c; return Str::snake($key); }
}
