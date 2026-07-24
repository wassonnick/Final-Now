<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Lead;
use App\Models\Locality;
use App\Models\Property;
use App\Models\Region;
use App\Models\Society;
use App\Models\VerifiedSocietyImportJob;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminLocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'enabled' => (bool) config('features.ncr_multicity'),
            'data' => [
                'regions' => Region::query()->with(['cities' => fn ($query) => $query->orderBy('name')])->orderBy('name')->get(),
                'cities' => $this->cityQuery($request)->get(),
                'zones' => $this->zoneQuery($request)->get(),
                'localities' => $this->localityQuery($request)->limit($request->integer('limit', 100))->get(),
            ],
        ]);
    }

    public function cities(Request $request): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $this->cityQuery($request)->get()]);
    }

    public function audit(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'enabled' => (bool) config('features.ncr_multicity'),
            'data' => [
                'summary' => [
                    'regions' => Region::query()->count(),
                    'cities' => City::query()->count(),
                    'zones' => Zone::query()->count(),
                    'localities' => Locality::query()->count(),
                ],
                'societies' => $this->inventoryAudit(Society::query(), ['Verified', 'Premium']),
                'properties' => $this->inventoryAudit(Property::query(), ['Live']),
                'leads' => $this->leadAudit(),
                'verified_import_jobs' => $this->verifiedImporterAudit(),
                'city_readiness' => $this->cityReadiness(),
                'recommendation' => $this->auditRecommendation(),
            ],
        ]);
    }

    public function zones(Request $request): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $this->zoneQuery($request)->get()]);
    }

    public function localities(Request $request): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $this->localityQuery($request)->paginate($request->integer('per_page', 50))]);
    }

    public function storeZone(Request $request): JsonResponse
    {
        $payload = $this->zonePayload($request);
        $payload['slug'] = $payload['slug'] ?? Str::slug($payload['name']);

        return response()->json(['status' => 'ok', 'data' => Zone::create($payload)], 201);
    }

    public function updateZone(Request $request, Zone $zone): JsonResponse
    {
        $payload = $this->zonePayload($request, true);
        if (isset($payload['name']) && empty($payload['slug'])) {
            $payload['slug'] = Str::slug($payload['name']);
        }
        $zone->update($payload);

        return response()->json(['status' => 'ok', 'data' => $zone->fresh()]);
    }

    public function storeLocality(Request $request): JsonResponse
    {
        $payload = $this->localityPayload($request);
        $payload['slug'] = $payload['slug'] ?? Str::slug($payload['name']);
        $payload['published_status'] = $payload['published_status'] ?? 'draft';

        return response()->json(['status' => 'ok', 'data' => Locality::create($payload)], 201);
    }

    public function updateLocality(Request $request, Locality $locality): JsonResponse
    {
        $payload = $this->localityPayload($request, true);
        if (isset($payload['name']) && empty($payload['slug'])) {
            $payload['slug'] = Str::slug($payload['name']);
        }
        $locality->update($payload);

        return response()->json(['status' => 'ok', 'data' => $locality->fresh()]);
    }

    private function cityQuery(Request $request)
    {
        return City::query()
            ->when($request->filled('region_id'), fn ($query) => $query->where('region_id', $request->integer('region_id')))
            ->when($request->filled('q'), fn ($query) => $query->where('name', $this->textSearchOperator(), '%'.$request->string('q').'%'))
            ->orderBy('name');
    }

    private function zoneQuery(Request $request)
    {
        return Zone::query()
            ->when($request->filled('region_id'), fn ($query) => $query->where('region_id', $request->integer('region_id')))
            ->when($request->filled('city_id'), fn ($query) => $query->where('city_id', $request->integer('city_id')))
            ->when($request->filled('q'), fn ($query) => $query->where('name', $this->textSearchOperator(), '%'.$request->string('q').'%'))
            ->orderBy('name');
    }

    private function localityQuery(Request $request)
    {
        return Locality::query()
            ->when($request->filled('region_id'), fn ($query) => $query->where('region_id', $request->integer('region_id')))
            ->when($request->filled('city_id'), fn ($query) => $query->where('city_id', $request->integer('city_id')))
            ->when($request->filled('zone_id'), fn ($query) => $query->where('zone_id', $request->integer('zone_id')))
            ->when($request->filled('q'), fn ($query) => $query->where('name', $this->textSearchOperator(), '%'.$request->string('q').'%'))
            ->orderBy('city')
            ->orderBy('name');
    }

    private function textSearchOperator(): string
    {
        return app('db')->connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';
    }

    private function inventoryAudit($query, array $publicStatuses): array
    {
        $model = $query->getModel();
        $table = $model->getTable();

        return [
            'total' => (clone $query)->count(),
            'missing_city_id' => (clone $query)->whereNull('city_id')->count(),
            'mapped_city_id' => (clone $query)->whereNotNull('city_id')->count(),
            'public_missing_city_id' => Schema::hasColumn($table, 'status')
                ? (clone $query)->whereIn('status', $publicStatuses)->whereNull('city_id')->count()
                : 0,
            'gurgaon_text_without_city_id' => Schema::hasColumn($table, 'city')
                ? (clone $query)->whereNull('city_id')->whereIn('city', ['Gurgaon', 'Gurugram'])->count()
                : 0,
            'top_unmapped_city_text' => Schema::hasColumn($table, 'city') ? $this->topCityText((clone $query)->whereNull('city_id')) : [],
        ];
    }

    private function leadAudit(): array
    {
        return [
            'total' => Lead::query()->count(),
            'missing_city_id' => Lead::query()->whereNull('city_id')->count(),
            'mapped_city_id' => Lead::query()->whereNotNull('city_id')->count(),
            'has_target_city_without_city_id' => Lead::query()->whereNull('city_id')->whereNotNull('target_city')->count(),
            'top_unmapped_target_city_text' => $this->topCityText(Lead::query()->whereNull('city_id'), 'target_city'),
        ];
    }

    private function verifiedImporterAudit(): array
    {
        if (! Schema::hasTable('verified_society_import_jobs')) {
            return [
                'total' => 0,
                'missing_target_city_id' => 0,
                'mapped_target_city_id' => 0,
                'gurgaon_target_without_city_id' => 0,
                'top_unmapped_target_city_text' => [],
            ];
        }

        return [
            'total' => VerifiedSocietyImportJob::query()->count(),
            'missing_target_city_id' => VerifiedSocietyImportJob::query()->whereNull('target_city_id')->count(),
            'mapped_target_city_id' => VerifiedSocietyImportJob::query()->whereNotNull('target_city_id')->count(),
            'gurgaon_target_without_city_id' => VerifiedSocietyImportJob::query()->whereNull('target_city_id')->whereIn('target_city', ['Gurgaon', 'Gurugram'])->count(),
            'top_unmapped_target_city_text' => $this->topCityText(VerifiedSocietyImportJob::query()->whereNull('target_city_id'), 'target_city'),
        ];
    }

    private function topCityText($query, string $column = 'city'): array
    {
        return $query
            ->whereNotNull($column)
            ->selectRaw($column.' as label, count(*) as total')
            ->groupBy($column)
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($row) => ['label' => $row->label, 'total' => (int) $row->total])
            ->values()
            ->all();
    }

    private function auditRecommendation(): array
    {
        $publicSocietiesMissing = Society::query()->whereIn('status', ['Verified', 'Premium'])->whereNull('city_id')->count();
        $publicPropertiesMissing = Property::query()->where('status', 'Live')->whereNull('city_id')->count();

        return [
            'ready_for_public_city_filters' => $publicSocietiesMissing === 0 && $publicPropertiesMissing === 0,
            'message' => $publicSocietiesMissing === 0 && $publicPropertiesMissing === 0
                ? 'Public society/property rows have structured city IDs. Keep public NCR routes feature-flagged until content and sitemap rollout are approved.'
                : 'Do not enable public NCR city filters yet. Backfill structured city IDs for public societies/properties first.',
        ];
    }

    private function cityReadiness(): array
    {
        $indexingEnabled = (bool) config('features.ncr_city_indexing', false);
        $indexableSlugs = collect((array) config('features.ncr_indexable_city_slugs', []))
            ->map(fn ($slug) => Str::slug((string) $slug))
            ->filter()
            ->values();

        return City::query()
            ->where('is_active', true)
            ->whereIn('slug', ['gurgaon', 'delhi', 'noida', 'greater-noida', 'faridabad'])
            ->orderByRaw("CASE slug WHEN 'gurgaon' THEN 1 WHEN 'delhi' THEN 2 WHEN 'noida' THEN 3 WHEN 'greater-noida' THEN 4 WHEN 'faridabad' THEN 5 ELSE 99 END")
            ->get()
            ->map(function (City $city) use ($indexingEnabled, $indexableSlugs) {
                $publicSocieties = Society::query()
                    ->where('is_published', true)
                    ->whereIn('status', ['Verified', 'Premium'])
                    ->where('city_id', $city->id)
                    ->count();

                $draftSocieties = Society::query()
                    ->where('city_id', $city->id)
                    ->where(function ($query) {
                        $query->where('is_published', false)
                            ->orWhereNotIn('status', ['Verified', 'Premium']);
                    })
                    ->count();

                $publicProperties = Property::query()
                    ->where('status', 'Live')
                    ->where('city_id', $city->id)
                    ->count();

                $zones = Zone::query()->where('city_id', $city->id)->count();
                $localities = Locality::query()->where('city_id', $city->id)->count();
                $publishedLocalities = Locality::query()
                    ->where('city_id', $city->id)
                    ->where('published_status', 'published')
                    ->count();

                $verifiedImportJobs = Schema::hasTable('verified_society_import_jobs')
                    ? VerifiedSocietyImportJob::query()->where('target_city_id', $city->id)->count()
                    : 0;

                $cityNames = $city->slug === 'gurgaon' ? ['Gurgaon', 'Gurugram'] : [$city->name];
                $unmappedPublicSocietiesByText = Society::query()
                    ->where('is_published', true)
                    ->whereIn('status', ['Verified', 'Premium'])
                    ->whereNull('city_id')
                    ->whereIn('city', $cityNames)
                    ->count();
                $unmappedPublicPropertiesByText = Property::query()
                    ->where('status', 'Live')
                    ->whereNull('city_id')
                    ->whereIn('city', $cityNames)
                    ->count();

                $indexingApproved = $indexingEnabled && $indexableSlugs->contains($city->slug);
                $contentReady = $publicSocieties >= 5 && $localities >= 3 && ($unmappedPublicSocietiesByText + $unmappedPublicPropertiesByText) === 0;
                $readyForRollout = $contentReady && $indexingApproved;

                $status = 'hold_noindex';
                if ($city->slug === 'gurgaon' && $publicSocieties > 0) {
                    $status = 'core_market_live';
                } elseif ($readyForRollout) {
                    $status = 'approved_for_city_indexing';
                } elseif ($publicSocieties < 5) {
                    $status = 'needs_verified_societies';
                } elseif ($localities < 3) {
                    $status = 'needs_locality_depth';
                } elseif (! $indexingApproved) {
                    $status = 'awaiting_indexing_approval';
                }

                return [
                    'city_id' => $city->id,
                    'name' => $city->name,
                    'slug' => $city->slug,
                    'state' => $city->state,
                    'city_type' => $city->city_type,
                    'zones_count' => $zones,
                    'localities_count' => $localities,
                    'published_localities_count' => $publishedLocalities,
                    'public_societies_count' => $publicSocieties,
                    'draft_societies_count' => $draftSocieties,
                    'public_properties_count' => $publicProperties,
                    'verified_import_jobs_count' => $verifiedImportJobs,
                    'unmapped_public_rows_count' => $unmappedPublicSocietiesByText + $unmappedPublicPropertiesByText,
                    'content_ready' => $contentReady,
                    'indexing_approved' => $indexingApproved,
                    'ready_for_public_rollout' => $readyForRollout,
                    'recommended_status' => $status,
                    'next_actions' => $this->cityNextActions($city, $publicSocieties, $localities, $indexingApproved, $unmappedPublicSocietiesByText + $unmappedPublicPropertiesByText),
                ];
            })
            ->values()
            ->all();
    }

    private function cityNextActions(City $city, int $publicSocieties, int $localities, bool $indexingApproved, int $unmappedPublicRows): array
    {
        $actions = [];

        if ($unmappedPublicRows > 0) {
            $actions[] = 'Backfill structured city IDs for public rows matching this city text.';
        }

        if ($publicSocieties < 5 && $city->slug !== 'gurgaon') {
            $actions[] = 'Import and approve at least five verified society profiles before public city SEO.';
        }

        if ($localities < 3) {
            $actions[] = 'Add draft/review localities for the main sectors and corridors.';
        }

        if (! $indexingApproved) {
            $actions[] = 'Keep noindex and out of sitemap until city launch is explicitly approved.';
        }

        if ($actions === []) {
            $actions[] = 'Ready for manual city launch review; do not index until final approval.';
        }

        return $actions;
    }

    private function zonePayload(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'region_id' => 'nullable|integer|exists:regions,id',
            'city_id' => 'nullable|integer|exists:cities,id',
            'name' => "{$required}|string|max:255",
            'slug' => 'nullable|string|max:255',
            'zone_type' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:5000',
            'is_active' => 'nullable|boolean',
        ]);
    }

    private function localityPayload(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'region_id' => 'nullable|integer|exists:regions,id',
            'city_id' => 'nullable|integer|exists:cities,id',
            'zone_id' => 'nullable|integer|exists:zones,id',
            'name' => "{$required}|string|max:255",
            'slug' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'locality_type' => 'nullable|string|max:100',
            'sector_code' => 'nullable|string|max:100',
            'published_status' => 'nullable|in:draft,review,published,archived',
            'seo_title' => 'nullable|string|max:255',
            'seo_description' => 'nullable|string|max:5000',
            'description' => 'nullable|string|max:5000',
            'connectivity_score' => 'nullable|numeric|min:0|max:10',
            'safety_score' => 'nullable|numeric|min:0|max:10',
            'lifestyle_score' => 'nullable|numeric|min:0|max:10',
        ]);
    }
}
