<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
class SocietyController extends Controller {
  public function index(Request $request): JsonResponse {
    $query=Society::query();
    if (!$request->is('api/admin/*')) {
      $query->whereIn('status', ['Verified', 'Premium']);
    }
    if($request->filled('q')){ $q=$request->string('q'); $query->where(fn($b)=>$b->where('name','ilike',"%{$q}%")->orWhere('locality','ilike',"%{$q}%")->orWhere('sector','ilike',"%{$q}%")->orWhere('builder','ilike',"%{$q}%")); }
    if($request->boolean('featured')) $query->where('featured',true);
    return response()->json(['status'=>'ok','data'=>$query->withCount('properties')->orderByDesc('featured')->orderByDesc('search_boost')->orderBy('name')->paginate($request->integer('per_page',24))]);
  }
  public function show(string $idOrSlug): JsonResponse
{
    $society = Society::with('properties')
        ->when(is_numeric($idOrSlug), fn ($query) => $query->where('id', $idOrSlug), fn ($query) => $query->where('slug', $idOrSlug))
        ->first();

    if (!$society || (!request()->is('api/admin/*') && !in_array($society->status, ['Verified', 'Premium'], true))) {
        return response()->json([
            'status' => 'error',
            'message' => 'Society not found',
        ], 404);
    }

    return response()->json([
        'status' => 'ok',
        'data' => $society,
    ]);
}
  public function store(Request $request): JsonResponse { $p=$this->payload($request); $p['slug']=$p['slug']??Str::slug($p['name']); $s=Society::create($p); return response()->json(['status'=>'ok','message'=>'Society created successfully.','data'=>$s],201); }
  public function update(Request $request, Society $society): JsonResponse { $p=$this->payload($request,true); if(isset($p['name'])&&empty($p['slug'])) $p['slug']=Str::slug($p['name']); $society->update($p); return response()->json(['status'=>'ok','message'=>'Society updated successfully.','data'=>$society]); }
  public function enrich(Society $society): JsonResponse {
    if (!$society->source_url) {
      return response()->json(['status'=>'error','message'=>'No source URL saved for this society.'],422);
    }

    $response = Http::timeout(30)
      ->withHeaders(['User-Agent'=>'SocietyFlats draft enricher (+https://societyflats.com)'])
      ->get($society->source_url);

    if (!$response->successful()) {
      return response()->json(['status'=>'error','message'=>"Source returned HTTP {$response->status()}."],422);
    }

    $meta = $this->extractMeta($response->body());
    $text = trim(($meta['description'] ?? '').' '.($meta['keywords'] ?? '').' '.strip_tags($response->body()));
    $updates = $this->enrichmentPayload($society, $meta, $text);

    if (!$updates) {
      return response()->json(['status'=>'ok','message'=>'No new enrichment fields found.','data'=>$society]);
    }

    $society->update($updates);

    return response()->json(['status'=>'ok','message'=>'Draft society enriched from public source. Review before publishing.','data'=>$society->fresh()]);
  }
  public function destroy(Society $society): JsonResponse { $society->delete(); return response()->json(['status'=>'ok','message'=>'Society deleted successfully.']); }
  private function payload(Request $r,bool $partial=false): array { $req=$partial?'sometimes':'required'; return $r->validate(['name'=>"{$req}|string|max:255",'slug'=>'nullable|string|max:255','builder'=>'nullable|string|max:255','sector'=>'nullable|string|max:255','locality'=>'nullable|string|max:255','address'=>'nullable|string|max:500','description'=>'nullable|string','year_built'=>'nullable|string|max:50','total_towers'=>'nullable|string|max:50','total_units'=>'nullable|string|max:50','maintenance_charges'=>'nullable|string|max:100','rent_range'=>'nullable|string|max:100','buy_range'=>'nullable|string|max:100','rental_yield'=>'nullable|string|max:100','average_rent'=>'nullable|string|max:100','average_sale_price'=>'nullable|string|max:100','price_per_sqft'=>'nullable|string|max:100','score'=>'nullable|numeric|min:0|max:10','security_score'=>'nullable|numeric|min:0|max:10','maintenance_score'=>'nullable|numeric|min:0|max:10','connectivity_score'=>'nullable|numeric|min:0|max:10','lifestyle_score'=>'nullable|numeric|min:0|max:10','investment_score'=>'nullable|numeric|min:0|max:10','amenities'=>'nullable|array','nearby_schools'=>'nullable|string','nearby_metro'=>'nullable|string','nearby_hospitals'=>'nullable|string','nearby_office_hubs'=>'nullable|string','meta_title'=>'nullable|string|max:255','meta_description'=>'nullable|string','faq'=>'nullable|string','status'=>'nullable|string|max:100','featured'=>'nullable|boolean','show_in_hero'=>'nullable|boolean','search_boost'=>'nullable|boolean','latitude'=>'nullable|string|max:100','longitude'=>'nullable|string|max:100','rwa_contact'=>'nullable|string|max:255','cover_image'=>'nullable|string','gallery_images'=>'nullable|array','brochure_name'=>'nullable|string|max:255','rera_number'=>'nullable|string|max:100','source_name'=>'nullable|string|max:255','source_url'=>'nullable|string','data_quality'=>'nullable|string|max:255']); }

  private function extractMeta(string $html): array {
    $meta = [];
    if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches)) {
      $meta['title'] = html_entity_decode(trim(strip_tags($matches[1])), ENT_QUOTES | ENT_HTML5);
    }

    if (preg_match_all('/<meta\s+[^>]*>/i', $html, $matches)) {
      foreach ($matches[0] as $tag) {
        if (!preg_match('/(?:name|property)=["\']([^"\']+)["\']/i', $tag, $keyMatch) || !preg_match('/content=["\']([^"\']*)["\']/i', $tag, $contentMatch)) {
          continue;
        }

        $key = strtolower($keyMatch[1]);
        if (in_array($key, ['description', 'keywords', 'og:description', 'twitter:description'], true)) {
          $meta[str_replace(['og:', 'twitter:'], '', $key)] = html_entity_decode(trim($contentMatch[1]), ENT_QUOTES | ENT_HTML5);
        }
      }
    }

    return $meta;
  }

  private function enrichmentPayload(Society $society, array $meta, string $text): array {
    $updates = [];
    $description = $meta['description'] ?? $meta['og:description'] ?? null;

    $this->setIfBlank($updates, $society, 'description', $description);
    $this->setIfBlank($updates, $society, 'meta_title', $meta['title'] ?? "{$society->name} Gurgaon - Society Profile");
    $this->setIfBlank($updates, $society, 'meta_description', $description);

    if (!$society->rera_number && preg_match('/RERA[\s-]*(?:GRG|GGM|PROJ)?[\s-]*[A-Z0-9-]+/i', $text, $matches)) {
      $updates['rera_number'] = trim($matches[0]);
    }

    if (!$society->sector && preg_match('/Sector[\s‑-]*[0-9A-Za-z]+/i', $text, $matches)) {
      $updates['sector'] = str_replace('‑', '-', trim($matches[0]));
    }

    if (!$society->locality && preg_match('/(Golf Course Road|Golf Course Extension Road|Dwarka Expressway|Sohna Road|NH[‑ -]?8|New Gurgaon|Gurugram)/i', $text, $matches)) {
      $updates['locality'] = str_replace('‑', '-', trim($matches[1]));
    }

    if (!$society->total_towers && preg_match('/([0-9]+)\s+towers?/i', $text, $matches)) {
      $updates['total_towers'] = $matches[1];
    }

    if (!$society->total_units && preg_match('/([0-9,]+)\s+units?/i', $text, $matches)) {
      $updates['total_units'] = str_replace(',', '', $matches[1]);
    }

    if (!$society->buy_range && preg_match('/(?:from|starting(?:\s+at)?)\s+(?:Rs\.?|₹)\s*([0-9.]+\s*(?:Cr|Lakh|L))/i', $text, $matches)) {
      $updates['buy_range'] = 'From ₹'.trim($matches[1]);
    }

    $amenities = array_values(array_unique(array_merge($society->amenities ?: [], $this->amenitiesFromText($text))));
    if ($amenities !== ($society->amenities ?: [])) {
      $updates['amenities'] = $amenities;
    }

    $updates['data_quality'] = trim(($society->data_quality ?: 'Imported draft').' | Enriched from public source - verify before publishing');

    return $updates;
  }

  private function setIfBlank(array &$updates, Society $society, string $field, ?string $value): void {
    if (!$society->{$field} && $value) {
      $updates[$field] = trim($value);
    }
  }

  private function amenitiesFromText(string $text): array {
    $map = [
      'clubhouse' => 'Clubhouse',
      'club house' => 'Clubhouse',
      'swimming pool' => 'Swimming Pool',
      'gym' => 'Gym',
      'fitness' => 'Gym',
      'kids' => 'Kids Play Area',
      'children' => 'Kids Play Area',
      'tennis' => 'Tennis Court',
      'badminton' => 'Badminton Court',
      'basketball' => 'Basketball Court',
      'jogging' => 'Jogging Track',
      'power backup' => 'Power Backup',
      'security' => '24x7 Security',
      'cctv' => 'CCTV',
      'landscape' => 'Landscaped Greens',
      'green' => 'Landscaped Greens',
    ];

    $haystack = Str::lower($text);
    $amenities = [];

    foreach ($map as $needle => $amenity) {
      if (str_contains($haystack, $needle)) {
        $amenities[] = $amenity;
      }
    }

    return $amenities;
  }
}
