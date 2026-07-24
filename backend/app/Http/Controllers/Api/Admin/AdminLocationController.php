<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Locality;
use App\Models\Region;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
