<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Builder;
use App\Models\Locality;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminSocietyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Society::with(['builder', 'locality'])->latest();

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('slug', 'ILIKE', "%{$search}%")
                  ->orWhere('address', 'ILIKE', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedPayload($request);
        $society = Society::create($data)->load(['builder', 'locality']);

        return response()->json($society, 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Society::with(['builder', 'locality', 'properties'])->findOrFail($id));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $society = Society::findOrFail($id);
        $society->update($this->validatedPayload($request, $society));

        return response()->json($society->fresh(['builder', 'locality']));
    }

    public function destroy(string $id): JsonResponse
    {
        Society::findOrFail($id)->delete();
        return response()->json(['message' => 'Society deleted']);
    }

    private function validatedPayload(Request $request, ?Society $society = null): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'builder_id' => 'nullable|uuid|exists:builders,id',
            'builder' => 'nullable|string|max:255',
            'locality_id' => 'nullable|uuid|exists:localities,id',
            'locality' => 'nullable|string|max:255',
            'sector' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'total_towers' => 'nullable|integer',
            'total_units' => 'nullable|integer',
            'possession_year' => 'nullable|integer',
            'year_built' => 'nullable|integer',
            'construction_status' => 'nullable|string|max:50',
            'security_score' => 'nullable|numeric|min:0|max:100',
            'maintenance_score' => 'nullable|numeric|min:0|max:100',
            'amenities_score' => 'nullable|numeric|min:0|max:100',
            'connectivity_score' => 'nullable|numeric|min:0|max:100',
            'family_friendly_score' => 'nullable|numeric|min:0|max:100',
            'pet_friendly_score' => 'nullable|numeric|min:0|max:100',
            'construction_quality_score' => 'nullable|numeric|min:0|max:100',
            'rental_demand_score' => 'nullable|numeric|min:0|max:100',
            'overall_score' => 'nullable|numeric|min:0|max:100',
            'amenities' => 'nullable|array',
            'nearby_facilities' => 'nullable|array',
            'cover_image' => 'nullable|string',
            'gallery_images' => 'nullable|array',
            'video_tour_url' => 'nullable|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'content_html' => 'nullable|string',
            'description' => 'nullable|string',
            'faqs' => 'nullable|array',
            'faq' => 'nullable|string',
            'is_verified' => 'nullable|boolean',
            'verification_status' => 'nullable|string|max:50',
            'featured' => 'nullable|boolean',
            'sponsored' => 'nullable|boolean',
            'status' => 'nullable|string|max:50',
        ]);

        $slug = $validated['slug'] ?? Str::slug($validated['name']);
        $validated['slug'] = $this->uniqueSlug($slug, $society?->id);

        if (empty($validated['builder_id']) && !empty($validated['builder'])) {
            $builder = Builder::firstOrCreate(
                ['slug' => Str::slug($validated['builder'])],
                ['name' => $validated['builder']]
            );
            $validated['builder_id'] = $builder->id;
        }
        unset($validated['builder']);

        if (empty($validated['locality_id']) && (!empty($validated['locality']) || !empty($validated['sector']))) {
            $name = $validated['locality'] ?: $validated['sector'];
            $locality = Locality::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'city' => 'Gurgaon', 'state' => 'Haryana']
            );
            $validated['locality_id'] = $locality->id;
        }
        unset($validated['locality'], $validated['sector']);

        if (isset($validated['year_built']) && empty($validated['possession_year'])) {
            $validated['possession_year'] = $validated['year_built'];
        }
        unset($validated['year_built']);

        if (isset($validated['description']) && empty($validated['content_html'])) {
            $validated['content_html'] = $validated['description'];
        }
        unset($validated['description']);

        if (isset($validated['faq']) && empty($validated['faqs'])) {
            $validated['faqs'] = array_values(array_filter(array_map('trim', explode("\n", $validated['faq']))));
        }
        unset($validated['faq']);

        $validated['status'] = $validated['status'] ?? 'active';
        $validated['verification_status'] = $validated['verification_status'] ?? 'pending';
        $validated['is_verified'] = $validated['is_verified'] ?? false;
        $validated['featured'] = $validated['featured'] ?? false;
        $validated['sponsored'] = $validated['sponsored'] ?? false;

        return $validated;
    }

    private function uniqueSlug(string $slug, ?string $ignoreId = null): string
    {
        $base = Str::slug($slug) ?: 'society';
        $candidate = $base;
        $i = 2;

        while (Society::where('slug', $candidate)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $candidate = $base . '-' . $i++;
        }

        return $candidate;
    }
}
