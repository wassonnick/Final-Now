from pathlib import Path

path = Path("backend/app/Http/Controllers/Api/SocietyController.php")
text = path.read_text()

# Normalize store()
text = text.replace(
    "$p=$this->payload($request); $p['slug']=$p['slug']??Str::slug($p['name']); $s=Society::create($p);",
    "$p=$this->withSocietyDefaults($this->payload($request)); $p['slug']=$p['slug']??Str::slug($p['name']); $s=Society::create($p);"
)

# Normalize update()
text = text.replace(
    "$p=$this->payload($request,true); if(isset($p['name'])&&empty($p['slug'])) $p['slug']=Str::slug($p['name']); $society->update($p);",
    "$p=$this->withSocietyDefaults($this->payload($request,true), true); if(isset($p['name'])&&empty($p['slug'])) $p['slug']=Str::slug($p['name']); $society->update($p);"
)

# Normalize createFromFetchedData()
text = text.replace(
    "$payload = $this->payload($request);",
    "$payload = $this->withSocietyDefaults($this->payload($request));",
    1
)

helper = r'''
private function withSocietyDefaults(array $payload, bool $partial = false): array {
    $scoreFields = [
        'score',
        'security_score',
        'maintenance_score',
        'connectivity_score',
        'lifestyle_score',
        'investment_score',
    ];

    foreach ($scoreFields as $field) {
        if (!$partial || array_key_exists($field, $payload)) {
            if (!isset($payload[$field]) || $payload[$field] === '') {
                $payload[$field] = 0;
            }
        }
    }

    if (!$partial) {
        $payload['status'] = $payload['status'] ?? 'Draft';
        $payload['verification_status'] = $payload['verification_status'] ?? 'needs_verification';
        $payload['city'] = $payload['city'] ?? 'Gurugram';
        $payload['state'] = $payload['state'] ?? 'Haryana';
        $payload['amenities'] = $payload['amenities'] ?? [];
        $payload['gallery_images'] = $payload['gallery_images'] ?? [];
        $payload['approved_gallery_image_urls'] = $payload['approved_gallery_image_urls'] ?? [];
        $payload['image_status'] = $payload['image_status'] ?? 'placeholder';
        $payload['image_approved_by_admin'] = $payload['image_approved_by_admin'] ?? false;
        $payload['fields_to_verify'] = $payload['fields_to_verify'] ?? [];
        $payload['official_source_status'] = $payload['official_source_status'] ?? 'pending';
        $payload['data_quality'] = $payload['data_quality'] ?? 'manual_entry';
        $payload['is_published'] = $payload['is_published'] ?? false;
        $payload['featured'] = $payload['featured'] ?? false;
        $payload['show_in_hero'] = $payload['show_in_hero'] ?? false;
        $payload['search_boost'] = $payload['search_boost'] ?? false;
    }

    return $payload;
}
'''

if "private function withSocietyDefaults" not in text:
    text = text.replace("private function payload(Request $r,bool $partial=false): array", helper + " private function payload(Request $r,bool $partial=false): array")

path.write_text(text)
print("C6D-4 backend society defaults applied.")
