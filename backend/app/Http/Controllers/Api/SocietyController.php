<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Services\SocietyEnrichment\SocietyBrochureExtractionService;
use App\Services\SocietyEnrichment\SocietyUrlEnrichmentService;
use App\Services\GooglePlacesSocietyImageService;
class SocietyController extends Controller {
  public function index(Request $request): JsonResponse {
    $query=Society::query();
    if (!$request->is('api/admin/*')) {
      $query->where('is_published', true)
        ->whereIn('status', ['Verified', 'Premium']);
    }
    if($request->filled('q')){ $q=$request->string('q'); $query->where(fn($b)=>$b->where('name','ilike',"%{$q}%")->orWhere('locality','ilike',"%{$q}%")->orWhere('sector','ilike',"%{$q}%")->orWhere('builder','ilike',"%{$q}%")); }
    if($request->boolean('featured')) $query->where('featured',true);
    return response()->json(['status'=>'ok','data'=>$query->withCount('properties')->orderByDesc('featured')->orderByDesc('search_boost')->orderBy('name')->paginate($request->integer('per_page',24))]);
  }

  public function googlePlacePhoto(string $idOrSlug, GooglePlacesSocietyImageService $places)
  {
    $society = Society::query()
      ->when(is_numeric($idOrSlug), fn ($query) => $query->where('id', $idOrSlug), fn ($query) => $query->where('slug', $idOrSlug))
      ->first();

    if (!$society || !$society->is_published || !in_array($society->status, ['Verified', 'Premium'], true)) {
      return response()->json(['status' => 'error', 'message' => 'Society not found'], 404);
    }

    if ($society->image_status !== 'google_places_reference_found' || empty($society->place_id) || !$society->image_approved_by_admin) {
      return response()->json(['status' => 'error', 'message' => 'Google Places photo is not available for this society.'], 404);
    }

    try {
      $photo = $places->fetchDisplayPhoto($society, (int) request()->integer('w', 1400));
    } catch (\Throwable $exception) {
      return response()->json([
        'status' => 'error',
        'message' => 'Google Places photo could not be loaded.',
      ], 404);
    }

    return response($photo['body'], 200)
      ->header('Content-Type', $photo['content_type'])
      ->header('Cache-Control', 'public, max-age=86400')
      ->header('X-SocietyFlats-Image-Source', 'Google Places');
  }

  public function show(string $idOrSlug): JsonResponse
{
    $isAdmin = request()->is('api/admin/*');
    $properties = $isAdmin
        ? fn ($query) => $query
        : fn ($query) => $query->where('status', 'Live');

    $society = Society::with(['properties' => $properties])
        ->when(is_numeric($idOrSlug), fn ($query) => $query->where('id', $idOrSlug), fn ($query) => $query->where('slug', $idOrSlug))
        ->first();

    if (!$society || (!$isAdmin && (!$society->is_published || !in_array($society->status, ['Verified', 'Premium'], true)))) {
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
  public function store(Request $request): JsonResponse
  {
      $p = $this->withSocietyDefaults($this->payload($request));

      $p['slug'] = $p['slug'] ?? Str::slug($p['name']);

      $scoreFields = [
          'score',
          'security_score',
          'maintenance_score',
          'connectivity_score',
          'lifestyle_score',
          'investment_score',
      ];

      foreach ($scoreFields as $scoreField) {
          if (!array_key_exists($scoreField, $p) || $p[$scoreField] === null || $p[$scoreField] === '') {
              $p[$scoreField] = 0;
          }
      }

      $s = Society::create($p);

      return response()->json([
          'status' => 'ok',
          'message' => 'Society created successfully.',
          'data' => $s,
      ], 201);
  }
  public function update(Request $request, Society $society): JsonResponse { $p=$this->withSocietyDefaults($this->payload($request,true), true); if(isset($p['name'])&&empty($p['slug'])) $p['slug']=Str::slug($p['name']); $society->update($p); return response()->json(['status'=>'ok','message'=>'Society updated successfully.','data'=>$society]); }
  public function googlePlacesImageReference(Society $society, GooglePlacesSocietyImageService $places): JsonResponse
  {
    try {
      $reference = $places->findImageReference($society);
    } catch (\InvalidArgumentException $exception) {
      return response()->json([
        'status' => 'error',
        'message' => $exception->getMessage(),
      ], 422);
    } catch (\Throwable $exception) {
      return response()->json([
        'status' => 'error',
        'message' => 'Unable to fetch a Google Places photo reference.',
        'detail' => $exception->getMessage(),
      ], 422);
    }

    $fieldsToVerify = $society->fields_to_verify ?: [];

    if (!is_array($fieldsToVerify)) {
      $decoded = json_decode((string) $fieldsToVerify, true);
      $fieldsToVerify = is_array($decoded) ? $decoded : array_filter([(string) $fieldsToVerify]);
    }

    foreach (['google_places_image_rights', 'image_rights'] as $field) {
      if (!in_array($field, $fieldsToVerify, true)) {
        $fieldsToVerify[] = $field;
      }
    }

    $placeLocation = $reference['geometry']['location'] ?? [];
    $updates = [
      'place_id' => $reference['place_id'] ?: $society->place_id,
      'image_reference_url' => $reference['safe_reference_url'],
      'image_status' => 'google_places_reference_found',
      'image_approved_by_admin' => false,
      'image_alt_text' => $society->image_alt_text ?: $society->name . ' residential society in Gurugram',
      'image_credit' => $reference['credit'],
      'image_license_notes' => $reference['license_note'],
      'fields_to_verify' => array_values($fieldsToVerify),
    ];

    if (empty($society->google_maps_url) && ! empty($reference['url'])) {
      $updates['google_maps_url'] = $reference['url'];
    }
    if (empty($society->latitude) && isset($placeLocation['lat'])) {
      $updates['latitude'] = (string) $placeLocation['lat'];
    }
    if (empty($society->longitude) && isset($placeLocation['lng'])) {
      $updates['longitude'] = (string) $placeLocation['lng'];
    }

    $society->update($updates);

    return response()->json([
      'status' => 'ok',
      'message' => 'Google Places photo reference saved for admin review. It is not approved for public display.',
      'data' => $society->fresh(),
      'meta' => [
        'place_id' => $reference['place_id'],
        'place_name' => $reference['place_name'],
        'formatted_address' => $reference['formatted_address'],
        'place_url' => $reference['place_url'],
        'credit' => $reference['credit'],
      ],
    ]);
  }


  public function bulkGooglePlacesImageReferences(Request $request, GooglePlacesSocietyImageService $places): JsonResponse
  {
    $limit = (int) $request->query('limit', 5);

    if ($limit < 1) {
      $limit = 1;
    }

    if ($limit > 10) {
      $limit = 10;
    }

    $societies = Society::query()
      ->where('status', '!=', 'Archived')
      ->where(function ($query) {
        $query
          ->whereNull('place_id')
          ->orWhereNull('image_reference_url')
          ->orWhere('image_status', '!=', 'google_places_reference_found');
      })
      ->orderBy('id')
      ->limit($limit)
      ->get();

    $summary = [
      'limit' => $limit,
      'total_checked' => $societies->count(),
      'updated' => 0,
      'skipped' => 0,
      'failed' => 0,
      'items' => [],
      'errors' => [],
    ];

    foreach ($societies as $society) {
      try {
        $reference = $places->findImageReference($society);

        $fieldsToVerify = $society->fields_to_verify ?: [];

        if (!is_array($fieldsToVerify)) {
          $decoded = json_decode((string) $fieldsToVerify, true);
          $fieldsToVerify = is_array($decoded) ? $decoded : array_filter([(string) $fieldsToVerify]);
        }

        foreach (['google_places_image_rights', 'image_rights'] as $field) {
          if (!in_array($field, $fieldsToVerify, true)) {
            $fieldsToVerify[] = $field;
          }
        }

        $placeLocation = $reference['geometry']['location'] ?? [];
        $updates = [
          'place_id' => $reference['place_id'] ?: $society->place_id,
          'image_reference_url' => $reference['safe_reference_url'],
          'image_status' => 'google_places_reference_found',
          'image_approved_by_admin' => false,
          'image_alt_text' => $society->image_alt_text ?: $society->name . ' residential society in Gurugram',
          'image_credit' => $reference['credit'],
          'image_license_notes' => $reference['license_note'],
          'fields_to_verify' => array_values($fieldsToVerify),
        ];

        if (empty($society->google_maps_url) && ! empty($reference['url'])) {
          $updates['google_maps_url'] = $reference['url'];
        }
        if (empty($society->latitude) && isset($placeLocation['lat'])) {
          $updates['latitude'] = (string) $placeLocation['lat'];
        }
        if (empty($society->longitude) && isset($placeLocation['lng'])) {
          $updates['longitude'] = (string) $placeLocation['lng'];
        }

        $society->update($updates);

        $fresh = $society->fresh();

        $summary['updated']++;
        $summary['items'][] = [
          'id' => $fresh->id,
          'name' => $fresh->name,
          'slug' => $fresh->slug,
          'status' => 'updated',
          'place_id' => $fresh->place_id,
          'image_status' => $fresh->image_status,
          'image_credit' => $fresh->image_credit,
          'place_name' => $reference['place_name'],
          'formatted_address' => $reference['formatted_address'],
          'place_url' => $reference['place_url'],
        ];
      } catch (\Throwable $exception) {
        $summary['failed']++;

        $summary['errors'][] = [
          'id' => $society->id,
          'name' => $society->name,
          'slug' => $society->slug,
          'error' => $exception->getMessage(),
        ];

        $summary['items'][] = [
          'id' => $society->id,
          'name' => $society->name,
          'slug' => $society->slug,
          'status' => 'failed',
          'error' => $exception->getMessage(),
        ];
      }
    }

    return response()->json([
      'status' => 'ok',
      'message' => 'Bulk Google Places image reference fetch completed.',
      'summary' => $summary,
    ]);
  }

  public function fetchFromUrl(Request $request, SocietyUrlEnrichmentService $enrichment): JsonResponse {
    $validated = $request->validate([
      'official_project_url' => 'required|url|max:2000',
    ]);

    try {
      $result = $enrichment->fetchDraft($validated['official_project_url']);
    } catch (\InvalidArgumentException $exception) {
      return response()->json(['success'=>false,'status'=>'invalid_source','message'=>$exception->getMessage()],422);
    } catch (\Throwable $exception) {
      return response()->json(['success'=>false,'status'=>'fetch_failed','message'=>'Unable to fetch details from this URL.','detail'=>$exception->getMessage()],422);
    }

    return response()->json([
      'success' => true,
      'status' => 'draft_ready',
      'data' => $result['data'],
      'warnings' => $result['warnings'],
      'fields_to_verify' => $result['fields_to_verify'],
      'diagnostics' => $result['diagnostics'],
    ]);
  }

  public function fetchFromBrochure(Request $request, SocietyBrochureExtractionService $extraction): JsonResponse {
    $validated = $request->validate([
      'brochure' => 'required|file|mimes:pdf|max:20480',
      'context' => 'nullable|string',
    ]);

    $context = [];
    if (!empty($validated['context'])) {
      $decoded = json_decode((string) $validated['context'], true);
      if (is_array($decoded)) {
        $context = $decoded;
      }
    }

    try {
      $result = $extraction->fetchDraft($validated['brochure'], $context);
    } catch (\Throwable $exception) {
      return response()->json([
        'success' => false,
        'status' => 'brochure_parse_failed',
        'message' => 'Unable to extract details from this brochure PDF.',
        'detail' => $exception->getMessage(),
      ], 422);
    }

    return response()->json([
      'success' => true,
      'status' => 'brochure_draft_ready',
      'data' => $result['data'],
      'warnings' => $result['warnings'],
      'fields_to_verify' => $result['fields_to_verify'],
      'diagnostics' => $result['diagnostics'],
    ]);
  }

  public function createFromFetchedData(Request $request): JsonResponse {
    $payload = $this->withSocietyDefaults($this->payload($request));
    $payload['slug'] = $payload['slug'] ?: Str::slug($payload['name']);
    $publish = $request->boolean('publish');

    if ($publish) {
      $payload['status'] = $payload['status'] === 'Premium' ? 'Premium' : 'Verified';
      $payload['is_published'] = true;
      $payload['published_at'] = now();
    } else {
      $payload['status'] = $payload['status'] ?: 'Draft';
      $payload['is_published'] = false;
      $payload['published_at'] = null;
    }

    $match = Society::query()
      ->when($payload['official_project_url'] ?? null, fn ($query, $url) => $query->orWhere('official_project_url', $url))
      ->orWhere('slug', $payload['slug'])
      ->orWhere(function ($query) use ($payload) {
        $query->where('name', $payload['name']);
        if (!empty($payload['sector'])) {
          $query->where('sector', $payload['sector']);
        }
        if (!empty($payload['builder'])) {
          $query->where('builder', $payload['builder']);
        }
      })
      ->first();

    if ($match) {
      $match->update($payload);
      return response()->json(['status'=>'ok','message'=>'Existing society updated from fetched draft.','data'=>$match->fresh()]);
    }

    $society = Society::create($payload);

    return response()->json(['status'=>'ok','message'=>'Society created from fetched draft.','data'=>$society],201);
  }

  public function enrich(Society $society): JsonResponse {
    $sourceUrl = $society->official_project_url ?: $society->source_url;

    if (!$sourceUrl) {
      return response()->json(['status'=>'error','message'=>'No source URL saved for this society.'],422);
    }

    $response = Http::timeout(30)
      ->withHeaders(['User-Agent'=>'SocietyFlats draft enricher (+https://societyflats.com)'])
      ->get($sourceUrl);

    if (!$response->successful()) {
      return response()->json(['status'=>'error','message'=>"Source returned HTTP {$response->status()}."],422);
    }

    $meta = $this->extractMeta($response->body());
    $text = trim(($meta['description'] ?? '').' '.($meta['keywords'] ?? '').' '.strip_tags($response->body()));
    $diagnostics = [];
    $updates = $this->enrichmentPayload($society, $meta, $text, $sourceUrl, $diagnostics);
    $coordinates = $this->coordinatesForSociety($society, $updates, $diagnostics);

    if ($coordinates) {
      if (!$society->latitude) {
        $updates['latitude'] = $coordinates['lat'];
      }
      if (!$society->longitude) {
        $updates['longitude'] = $coordinates['lon'];
      }

      $updates += $this->nearbyIntelligence($society, $updates, $coordinates, $diagnostics);
    }

    $updates += $this->scorePayload($society, $updates);
    $updatedFields = array_keys($updates);

    if (!$updates) {
      return response()->json(['status'=>'ok','message'=>'No new enrichment fields found.','data'=>$society,'enrichment'=>['updated_fields'=>[],'diagnostics'=>$diagnostics]]);
    }

    $society->update($updates);

    return response()->json(['status'=>'ok','message'=>'Draft society enriched from public source. Review before publishing.','data'=>$society->fresh(),'enrichment'=>['updated_fields'=>$updatedFields,'diagnostics'=>$diagnostics]]);
  }

  public function backfillPublishFields(): JsonResponse
  {
    $summary = [
      'total' => 0,
      'published' => 0,
      'unpublished' => 0,
      'updated' => 0,
      'skipped' => 0,
    ];

    Society::query()
      ->orderBy('id')
      ->chunkById(100, function ($societies) use (&$summary) {
        foreach ($societies as $society) {
          $summary['total']++;

          $status = (string) ($society->status ?: 'Draft');
          $shouldPublish = in_array($status, ['Verified', 'Premium'], true);

          $updates = [];

          if ($shouldPublish) {
            $summary['published']++;

            if (! $society->is_published) {
              $updates['is_published'] = true;
            }

            if ($society->verification_status !== 'verified') {
              $updates['verification_status'] = 'verified';
            }

            if (! $society->published_at) {
              $updates['published_at'] = now();
            }
          } else {
            $summary['unpublished']++;

            if ($society->is_published) {
              $updates['is_published'] = false;
            }

            if ($society->published_at) {
              $updates['published_at'] = null;
            }

            if (! in_array($society->verification_status, ['needs_verification', 'draft', 'archived'], true)) {
              $updates['verification_status'] = $status === 'Archived' ? 'archived' : 'needs_verification';
            }
          }

          if ($updates) {
            $society->update($updates);
            $summary['updated']++;
          } else {
            $summary['skipped']++;
          }
        }
      });

    return response()->json([
      'status' => 'ok',
      'message' => 'C112E-B society publish fields backfilled safely.',
      'summary' => $summary,
    ]);
  }

  public function destroy(Society $society): JsonResponse { $society->delete(); return response()->json(['status'=>'ok','message'=>'Society deleted successfully.']); }
  
private function withSocietyDefaults(array $payload, bool $partial = false): array {
    $scoreFields = [
        'score',
        'security_score',
        'maintenance_score',
        'connectivity_score',
        'lifestyle_score',
        'investment_score',
        'source_confidence_score',
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
        $payload['fields_to_verify'] = $payload['fields_to_verify'] ?? [];
        $payload['image_status'] = $payload['image_status'] ?? 'placeholder';
        $payload['image_approved_by_admin'] = $payload['image_approved_by_admin'] ?? false;
        $payload['official_source_status'] = $payload['official_source_status'] ?? 'pending';
        $payload['data_quality'] = $payload['data_quality'] ?? 'manual_entry';
        $payload['source_confidence_score'] = $payload['source_confidence_score'] ?? 0;
        $payload['is_published'] = $payload['is_published'] ?? false;
        $payload['featured'] = $payload['featured'] ?? false;
        $payload['show_in_hero'] = $payload['show_in_hero'] ?? false;
        $payload['search_boost'] = $payload['search_boost'] ?? false;
    }

    foreach (['amenities', 'gallery_images', 'approved_gallery_image_urls', 'fields_to_verify'] as $arrayField) {
        if (array_key_exists($arrayField, $payload)) {
            if (is_array($payload[$arrayField])) {
                $payload[$arrayField] = json_encode(array_values($payload[$arrayField]));
            }

            if ($payload[$arrayField] === null || $payload[$arrayField] === '') {
                $payload[$arrayField] = '[]';
            }
        }
    }

    return $payload;
}
 private function payload(Request $r,bool $partial=false): array { $req=$partial?'sometimes':'required'; return $r->validate(['name'=>"{$req}|string|max:255",'slug'=>'nullable|string|max:255','builder'=>'nullable|string|max:255','sector'=>'nullable|string|max:255','locality'=>'nullable|string|max:255','city'=>'nullable|string|max:100','state'=>'nullable|string|max:100','society_type'=>'nullable|string|max:100','address'=>'nullable|string|max:500','description'=>'nullable|string','project_status'=>'nullable|string|max:100','possession_date'=>'nullable|string|max:100','configuration'=>'nullable|string|max:255','project_area'=>'nullable|string|max:100','unit_size_range'=>'nullable|string|max:100','year_built'=>'nullable|string|max:50','total_towers'=>'nullable|string|max:50','total_units'=>'nullable|string|max:50','maintenance_charges'=>'nullable|string|max:100','rent_range'=>'nullable|string|max:100','buy_range'=>'nullable|string|max:100','rental_yield'=>'nullable|string|max:100','average_rent'=>'nullable|string|max:100','average_sale_price'=>'nullable|string|max:100','price_per_sqft'=>'nullable|string|max:100','score'=>'nullable|numeric|min:0|max:10','security_score'=>'nullable|numeric|min:0|max:10','maintenance_score'=>'nullable|numeric|min:0|max:10','connectivity_score'=>'nullable|numeric|min:0|max:10','lifestyle_score'=>'nullable|numeric|min:0|max:10','investment_score'=>'nullable|numeric|min:0|max:10','amenities'=>'nullable|array','nearby_schools'=>'nullable|string','nearby_metro'=>'nullable|string','nearby_hospitals'=>'nullable|string','nearby_office_hubs'=>'nullable|string','meta_title'=>'nullable|string|max:255','meta_description'=>'nullable|string','faq'=>'nullable|string','status'=>'nullable|string|max:100','verification_status'=>'nullable|string|max:100','is_published'=>'nullable|boolean','published_at'=>'nullable|date','featured'=>'nullable|boolean','show_in_hero'=>'nullable|boolean','search_boost'=>'nullable|boolean','latitude'=>'nullable|string|max:100','longitude'=>'nullable|string|max:100','place_id'=>'nullable|string|max:255','rwa_contact'=>'nullable|string|max:255','cover_image'=>'nullable|string','gallery_images'=>'nullable|array','approved_gallery_image_urls'=>'nullable|array','image_reference_url'=>'nullable|string','image_url'=>'nullable|string','image_status'=>'nullable|string|max:100','image_approved_by_admin'=>'nullable|boolean','image_alt_text'=>'nullable|string|max:255','image_credit'=>'nullable|string|max:255','image_license_notes'=>'nullable|string','brochure_name'=>'nullable|string|max:255','rera_number'=>'nullable|string|max:100','rera_status'=>'nullable|string|max:100','source_name'=>'nullable|string|max:255','source_url'=>'nullable|string','official_source_url'=>'nullable|string','official_project_url'=>'nullable|string','official_developer_url'=>'nullable|string','official_brochure_url'=>'nullable|string','official_floor_plan_url'=>'nullable|string','official_gallery_url'=>'nullable|string','official_source_status'=>'nullable|string|max:100','official_source_notes'=>'nullable|string','fields_to_verify'=>'nullable|string','rera_search_url'=>'nullable|string','official_rera_source_url'=>'nullable|string','google_maps_url'=>'nullable|string','source_confidence_score'=>'nullable|integer|min:0|max:100','data_quality'=>'nullable|string|max:255']); }

  private function extractMeta(string $html): array {
    $meta = [];
    if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches)) {
      $meta['title'] = html_entity_decode(trim(strip_tags($matches[1])), ENT_QUOTES | ENT_HTML5);
    }

    if (preg_match_all('/<meta\s+([^>]+)>/i', $html, $matches)) {
      foreach ($matches[1] as $attributes) {
        $key = $this->htmlAttribute($attributes, 'name') ?: $this->htmlAttribute($attributes, 'property');
        $content = $this->htmlAttribute($attributes, 'content');

        if (!$key || !$content) {
          continue;
        }

        $key = strtolower($key);
        $value = html_entity_decode(trim($content), ENT_QUOTES | ENT_HTML5);

        if (in_array($key, ['description', 'og:description', 'twitter:description'], true)) {
          $meta['description'] = $value;
        } elseif ($key === 'keywords') {
          $meta['keywords'] = $value;
        } elseif (in_array($key, ['og:image', 'twitter:image', 'twitter:image:src'], true)) {
          $meta['image'] = $value;
        }
      }
    }

    return $meta;
  }

  private function htmlAttribute(string $attributes, string $name): ?string {
    if (preg_match('/\b'.preg_quote($name, '/').'\s*=\s*(["\'])(.*?)\1/is', $attributes, $matches)) {
      return $matches[2];
    }

    return null;
  }

  private function imageSourceAllowed(?string $url): bool {
    $host = Str::lower((string) parse_url((string) $url, PHP_URL_HOST));

    if (!$host) {
      return false;
    }

    foreach (['99acres', 'magicbricks', 'housing.com', 'google.', 'haryanarera', 'rera.', 'sitesetu.app', 'facebook.', 'instagram.', 'youtube.'] as $blocked) {
      if (str_contains($host, $blocked)) {
        return false;
      }
    }

    return true;
  }

  private function absoluteUrl(?string $url, ?string $baseUrl): ?string {
    if (!$url) {
      return null;
    }

    if (Str::startsWith($url, ['http://', 'https://'])) {
      return $url;
    }

    $scheme = parse_url((string) $baseUrl, PHP_URL_SCHEME) ?: 'https';
    $host = parse_url((string) $baseUrl, PHP_URL_HOST);

    if (!$host) {
      return null;
    }

    if (Str::startsWith($url, '//')) {
      return "{$scheme}:{$url}";
    }

    return $scheme.'://'.$host.'/'.ltrim($url, '/');
  }

  private function enrichmentPayload(Society $society, array $meta, string $text, string $sourceUrl, array &$diagnostics): array {
    $updates = [];
    $description = $meta['description'] ?? null;
    $imageSourceAllowed = $this->imageSourceAllowed($sourceUrl);
    $sourceImage = $imageSourceAllowed
      ? $this->absoluteUrl($meta['image'] ?? null, $sourceUrl)
      : null;

    if (!$imageSourceAllowed) {
      $diagnostics['source'] = 'RERA/search/property-portal sources cannot supply reusable images. Use the official builder project URL for images and richer details.';
    } elseif (!$sourceImage) {
      $diagnostics['source'] = 'No approved page image found on this source URL.';
    }

    $this->setIfBlankOrImported($updates, $society, 'description', $description);
    $this->setIfBlankOrImported($updates, $society, 'meta_title', $meta['title'] ?? "{$society->name} Gurgaon - Society Profile");
    $this->setIfBlankOrImported($updates, $society, 'meta_description', $description);

    if ($sourceImage && !$society->image_reference_url) {
      $updates['image_reference_url'] = $sourceImage;
      if (in_array($society->image_status, [null, '', 'placeholder', 'needs_review'], true)) {
        $updates['image_status'] = 'official_reference_found';
      }
    }

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

    if (!$society->year_built && preg_match('/(?:completion|completed|possession|ready)[^0-9]{0,20}(20[0-9]{2})/i', $text, $matches)) {
      $updates['year_built'] = $matches[1];
    }

    if (!$society->total_towers && preg_match('/([0-9]+)\s+(?:residential\s+)?blocks?/i', $text, $matches)) {
      $updates['total_towers'] = $matches[1];
    }

    if (!$society->buy_range && preg_match('/(?:from|starting(?:\s+at)?)\s+(?:Rs\.?|₹)\s*([0-9.]+\s*(?:Cr|Lakh|L))/i', $text, $matches)) {
      $updates['buy_range'] = 'From ₹'.trim($matches[1]);
    }

    if (!$society->average_sale_price && preg_match('/(?:Rs\.?|₹)\s*([0-9.]+\s*(?:Cr|Lakh|L))/i', $text, $matches)) {
      $updates['average_sale_price'] = '₹'.trim($matches[1]);
    }

    $amenities = array_values(array_unique(array_merge($society->amenities ?: [], $this->amenitiesFromText($text))));
    if ($amenities !== ($society->amenities ?: [])) {
      $updates['amenities'] = $amenities;
    }

    $quality = preg_replace('/\s*\|?\s*Auto-enriched\b[^|]*/i', '', (string) $society->data_quality);
    $updates['data_quality'] = Str::limit(trim('Auto-enriched | '.($quality ?: 'Imported draft').' | verify before publishing'), 255, '');
    $updates['official_source_last_checked_at'] = now();
    $updates['official_source_status'] = $society->official_project_url ? 'enriched' : 'needs_manual_review';

    return $updates;
  }

  private function coordinatesForSociety(Society $society, array $updates, array &$diagnostics): ?array {
    if ($society->latitude && $society->longitude && !$this->looksLikeGenericGurgaonCoordinate((float) $society->latitude, (float) $society->longitude)) {
      $diagnostics['geocode'] = 'Existing coordinates reused.';
      return ['lat' => (string) $society->latitude, 'lon' => (string) $society->longitude];
    }

    $sector = $updates['sector'] ?? $society->sector;
    $locality = $updates['locality'] ?? $society->locality;
    $queries = array_values(array_unique(array_filter([
      implode(', ', array_filter([$society->name, $sector, $locality, 'Gurugram Haryana India'])),
      implode(', ', array_filter([$society->name, 'Gurugram Haryana India'])),
    ])));

    foreach ($queries as $query) {
      $response = Http::timeout(20)
        ->withHeaders([
          'User-Agent' => 'SocietyFlats draft enricher (+https://societyflats.com)',
          'Accept' => 'application/json',
          'Accept-Language' => 'en-IN,en;q=0.9',
        ])
        ->get('https://nominatim.openstreetmap.org/search', [
          'format' => 'jsonv2',
          'limit' => 1,
          'countrycodes' => 'in',
          'addressdetails' => 1,
          'q' => $query,
        ]);

      if (!$response->successful()) {
        $diagnostics['geocode'] = "Nominatim returned HTTP {$response->status()}.";
        continue;
      }

      $items = $response->json();
      $item = is_array($items) ? ($items[0] ?? null) : null;

      if (is_array($item) && !empty($item['lat']) && !empty($item['lon']) && $this->isSpecificGurgaonResult($item, $society->name, $sector, $locality)) {
        $diagnostics['geocode'] = "Coordinates found using query: {$query}";
        return ['lat' => (string) $item['lat'], 'lon' => (string) $item['lon']];
      }
    }

    $diagnostics['geocode'] = 'No OpenStreetMap coordinates found.';
    return null;
  }

  private function isSpecificGurgaonResult(array $item, string $societyName, ?string $sector, ?string $locality): bool {
    $lat = (float) ($item['lat'] ?? 0);
    $lon = (float) ($item['lon'] ?? 0);
    $display = Str::lower((string) ($item['display_name'] ?? ''));
    $class = (string) ($item['class'] ?? '');
    $type = (string) ($item['type'] ?? '');

    if ($this->looksLikeGenericGurgaonCoordinate($lat, $lon)) {
      return false;
    }

    if (in_array($type, ['city', 'county', 'administrative'], true) || $class === 'boundary') {
      return false;
    }

    $nameWords = collect(preg_split('/\s+/', Str::lower($societyName)) ?: [])
      ->map(fn ($word) => trim($word, '.,()[]{}'))
      ->filter(fn ($word) => strlen($word) > 2 && !in_array($word, ['the', 'and', 'gurgaon', 'gurugram'], true))
      ->unique()
      ->values();
    $matchedNameWords = $nameWords->filter(fn ($word) => str_contains($display, $word))->count();
    $hasNameMatch = $nameWords->isNotEmpty() && $matchedNameWords >= min(2, $nameWords->count());

    if (!$hasNameMatch) {
      return false;
    }

    $sectorNeedle = $sector ? Str::lower($sector) : '';
    $localityNeedle = $locality ? Str::lower($locality) : '';
    $hasLocationMatch = false;

    if ($sectorNeedle && str_contains($display, $sectorNeedle)) {
      $hasLocationMatch = true;
    }

    if ($localityNeedle && $localityNeedle !== 'gurugram' && str_contains($display, $localityNeedle)) {
      $hasLocationMatch = true;
    }

    return (!$sectorNeedle && !$localityNeedle) || $hasLocationMatch;
  }

  private function looksLikeGenericGurgaonCoordinate(float $lat, float $lon): bool {
    return abs($lat - 28.4646) < 0.04 && abs($lon - 77.0299) < 0.04;
  }

  private function nearbyIntelligence(Society $society, array $updates, array $coordinates, array &$diagnostics): array {
    $lat = (float) $coordinates['lat'];
    $lon = (float) $coordinates['lon'];
    $query = <<<QUERY
[out:json][timeout:12];
(
  node(around:5000,{$lat},{$lon})["amenity"~"school|college|university|hospital|clinic"];
  node(around:5000,{$lat},{$lon})["railway"~"station|subway_entrance"];
  node(around:5000,{$lat},{$lon})["public_transport"="station"];
  node(around:5000,{$lat},{$lon})["office"];
  way(around:5000,{$lat},{$lon})["amenity"~"school|college|university|hospital|clinic"];
  way(around:5000,{$lat},{$lon})["railway"~"station|subway_entrance"];
  way(around:5000,{$lat},{$lon})["public_transport"="station"];
  way(around:5000,{$lat},{$lon})["office"];
);
out tags center 80;
QUERY;

    $response = Http::timeout(20)
      ->asForm()
      ->withHeaders(['User-Agent' => 'SocietyFlats draft enricher (+https://societyflats.com)'])
      ->post('https://overpass-api.de/api/interpreter', ['data' => $query]);

    if (!$response->successful()) {
      $diagnostics['nearby'] = "Overpass returned HTTP {$response->status()}.";
      return [];
    }

    $elements = $response->json('elements') ?: [];
    $groups = ['schools' => [], 'hospitals' => [], 'metro' => [], 'offices' => []];

    foreach ($elements as $element) {
      $tags = $element['tags'] ?? [];
      $name = trim((string) ($tags['name'] ?? ''));
      if (!$name) {
        continue;
      }

      $amenity = $tags['amenity'] ?? '';
      $railway = $tags['railway'] ?? '';
      $office = $tags['office'] ?? '';

      if (in_array($amenity, ['school', 'college', 'university'], true)) {
        $groups['schools'][] = $name;
      } elseif (in_array($amenity, ['hospital', 'clinic'], true)) {
        $groups['hospitals'][] = $name;
      } elseif (in_array($railway, ['station', 'subway_entrance'], true) || ($tags['public_transport'] ?? '') === 'station') {
        $groups['metro'][] = $name;
      } elseif ($office) {
        $groups['offices'][] = $name;
      }
    }

    $payload = [];
    if (!$society->nearby_schools && empty($updates['nearby_schools']) && $groups['schools']) {
      $payload['nearby_schools'] = implode(', ', array_slice(array_values(array_unique($groups['schools'])), 0, 6));
    }
    if (!$society->nearby_hospitals && empty($updates['nearby_hospitals']) && $groups['hospitals']) {
      $payload['nearby_hospitals'] = implode(', ', array_slice(array_values(array_unique($groups['hospitals'])), 0, 6));
    }
    if (!$society->nearby_metro && empty($updates['nearby_metro']) && $groups['metro']) {
      $payload['nearby_metro'] = implode(', ', array_slice(array_values(array_unique($groups['metro'])), 0, 5));
    }
    if (!$society->nearby_office_hubs && empty($updates['nearby_office_hubs']) && $groups['offices']) {
      $payload['nearby_office_hubs'] = implode(', ', array_slice(array_values(array_unique($groups['offices'])), 0, 6));
    }

    $diagnostics['nearby'] = 'Found '.count(array_unique($groups['schools'])).' education, '.count(array_unique($groups['hospitals'])).' healthcare, '.count(array_unique($groups['metro'])).' transit and '.count(array_unique($groups['offices'])).' office places.';

    return $payload;
  }

  private function scorePayload(Society $society, array $updates): array {
    $amenities = $updates['amenities'] ?? ($society->amenities ?: []);
    $amenityCount = count($amenities);
    $nearbySchools = $updates['nearby_schools'] ?? $society->nearby_schools;
    $nearbyHospitals = $updates['nearby_hospitals'] ?? $society->nearby_hospitals;
    $nearbyMetro = $updates['nearby_metro'] ?? $society->nearby_metro;
    $nearbyOffices = $updates['nearby_office_hubs'] ?? $society->nearby_office_hubs;
    $locality = Str::lower(($updates['locality'] ?? $society->locality).' '.($updates['sector'] ?? $society->sector));

    $security = $this->boundedScore(7.2 + (in_array('24x7 Security', $amenities, true) ? 1.1 : 0) + (in_array('CCTV', $amenities, true) ? 0.5 : 0));
    $maintenance = $this->boundedScore(7.1 + min($amenityCount, 8) * 0.12 + (($updates['total_towers'] ?? $society->total_towers) ? 0.3 : 0));
    $connectivity = $this->boundedScore(7.0 + ($nearbyMetro ? 0.8 : 0) + ($nearbyOffices ? 0.5 : 0) + (str_contains($locality, 'golf course') || str_contains($locality, 'dwarka') || str_contains($locality, 'nh') ? 0.5 : 0));
    $lifestyle = $this->boundedScore(7.0 + min($amenityCount, 10) * 0.16 + ($nearbySchools ? 0.3 : 0) + ($nearbyHospitals ? 0.2 : 0));
    $investment = $this->boundedScore(7.0 + (($updates['buy_range'] ?? $society->buy_range) || ($updates['average_sale_price'] ?? $society->average_sale_price) ? 0.5 : 0) + ($nearbyMetro ? 0.4 : 0) + ($nearbyOffices ? 0.3 : 0));
    $overall = round(($security + $maintenance + $connectivity + $lifestyle + $investment) / 5, 1);

    return [
      'score' => $overall,
      'security_score' => $security,
      'maintenance_score' => $maintenance,
      'connectivity_score' => $connectivity,
      'lifestyle_score' => $lifestyle,
      'investment_score' => $investment,
    ];
  }

  private function boundedScore(float $score): float {
    return round(max(6.5, min(9.6, $score)), 1);
  }

  private function setIfBlank(array &$updates, Society $society, string $field, ?string $value): void {
    if (!$society->{$field} && $value) {
      $updates[$field] = trim($value);
    }
  }

  private function setIfBlankOrImported(array &$updates, Society $society, string $field, ?string $value): void {
    $current = (string) $society->{$field};
    $looksImported = str_contains($current, 'Imported public RERA draft') || str_contains($current, 'Draft SocietyFlats profile');
    if ((!$current || $looksImported) && $value) {
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
    public function nearbyIntelligenceAutoFill(\App\Models\Society $society, \App\Services\GooglePlacesNearbyIntelligenceService $service)
    {
        $result = $service->suggestionsForSociety($society);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function bulkNearbyIntelligenceAutoFill(\Illuminate\Http\Request $request, \App\Services\GooglePlacesNearbyIntelligenceService $service)
    {
        $ids = collect($request->input('society_ids', []))
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->take(5)
            ->values();

        if ($ids->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Select up to 5 societies before running nearby autofill.',
                'summary' => ['processed' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0],
                'results' => [],
            ], 422);
        }

        $summary = ['processed' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0];
        $results = [];
        $societies = \App\Models\Society::whereIn('id', $ids)->get()->keyBy('id');

        foreach ($ids as $id) {
            try {
                $society = $societies->get($id);

                if (!$society) {
                    $summary['failed']++;
                    $results[] = ['id' => $id, 'status' => 'failed', 'message' => 'Society not found.'];
                    continue;
                }

                $summary['processed']++;
                $result = $service->suggestionsForSociety($society);

                if (!($result['success'] ?? false)) {
                    $summary['skipped']++;
                    $results[] = [
                        'id' => $society->id,
                        'name' => $society->name,
                        'status' => 'skipped',
                        'message' => $result['message'] ?? 'No suggestions returned.',
                    ];
                    continue;
                }

                $suggestions = $result['suggestions'] ?? [];
                $changed = [];
                $nearbyText = function ($value): string {
                    if (is_array($value)) {
                        return trim(implode("\n", array_filter(array_map(fn ($item) => is_scalar($item) ? trim((string) $item) : trim(json_encode($item)), $value))));
                    }

                    return trim((string) ($value ?? ''));
                };
                $nearbyLines = function (string $value): array {
                    return array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $value) ?: [])));
                };

                foreach (['nearby_schools', 'nearby_metro', 'nearby_hospitals', 'nearby_office_hubs'] as $field) {
                    $suggestion = $nearbyText($suggestions[$field] ?? '');
                    $current = $nearbyText($society->{$field} ?? '');

                    if ($suggestion !== '' && $current === '') {
                        $society->{$field} = $nearbyLines($suggestion);
                        $changed[] = $field;
                    }
                }

                if (!$changed) {
                    $summary['skipped']++;
                    $results[] = [
                        'id' => $society->id,
                        'name' => $society->name,
                        'status' => 'skipped',
                        'message' => 'No empty nearby fields were changed.',
                    ];
                    continue;
                }

                // Keep C109 bulk autofill safe: only fill empty nearby fields.
                // Do not mutate fields_to_verify/data_quality here because those columns may be cast as arrays.
                $society->save();

                $summary['updated']++;
                $results[] = [
                    'id' => $society->id,
                    'name' => $society->name,
                    'status' => 'updated',
                    'updated_fields' => $changed,
                ];
            } catch (\Throwable $error) {
                $summary['failed']++;
                $results[] = [
                    'id' => $id,
                    'status' => 'failed',
                    'message' => $error->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Bulk nearby autofill complete: {$summary['updated']} updated, {$summary['skipped']} skipped, {$summary['failed']} failed.",
            'summary' => $summary,
            'results' => $results,
        ]);
    }


}
