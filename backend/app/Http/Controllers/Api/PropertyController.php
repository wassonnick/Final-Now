<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PropertyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Property::query()->with(['society', 'sourceLead']);

        if (!$this->isAdminRequest($request)) {
            $q->where('status', 'Live')
                ->whereHas('society', fn ($society) => $society
                    ->where('is_published', true)
                    ->whereIn('status', ['Verified', 'Premium']));
        }

        if ($request->filled('q')) {
            $term = $request->string('q');
            $q->where(fn ($b) => $b
                ->where('title', 'ilike', "%{$term}%")
                ->orWhere('society', 'ilike', "%{$term}%")
                ->orWhere('locality', 'ilike', "%{$term}%")
                ->orWhere('listing_type', 'ilike', "%{$term}%")
            );
        }

        if ($request->filled('listing_type')) {
            $q->where('listing_type', $request->string('listing_type'));
        }

        if ($request->boolean('featured')) {
            $q->where('featured', true);
        }

        return response()->json([
            'status' => 'ok',
            'data' => $q->latest()->paginate($request->integer('per_page', 24)),
        ]);
    }

    public function show(Request $request, string $idOrSlug): JsonResponse
    {
        $query = Property::with(['society', 'sourceLead']);

        if (!$this->isAdminRequest($request)) {
            $query->where('status', 'Live')
                ->whereHas('society', fn ($society) => $society
                    ->where('is_published', true)
                    ->whereIn('status', ['Verified', 'Premium']));
        }

    if (is_numeric($idOrSlug)) {
        $property = $query->where('id', $idOrSlug)->first();
    } else {
        $property = $query->where('slug', $idOrSlug)->first();
    }

    if (!$property) {
        return response()->json([
            'status' => 'error',
            'message' => 'Property not found',
        ], 404);
    }

    $data = $property->toArray();

    $data['amenities'] = is_string($property->amenities)
        ? json_decode($property->amenities, true) ?? []
        : ($property->amenities ?? []);

    $data['images'] = is_string($property->images)
        ? json_decode($property->images, true) ?? []
        : ($property->images ?? []);

        return response()->json([
            'status' => 'ok',
            'data' => $data,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $p = $this->payload($request);
        $p['slug'] = $p['slug'] ?? Str::slug($p['title']) . '-' . Str::random(5);

        if (!empty($p['society']) && empty($p['society_id'])) {
            $p['society_id'] = Society::where('name', $p['society'])->value('id');
        }

        $property = Property::create($p);

        return response()->json([
            'status' => 'ok',
            'message' => 'Property created successfully.',
            'data' => $property,
        ], 201);
    }

    public function update(Request $request, Property $property): JsonResponse
    {
        $p = $this->payload($request, true);

        if (!empty($p['society']) && empty($p['society_id'])) {
            $p['society_id'] = Society::where('name', $p['society'])->value('id');
        }

        $property->update($p);

        return response()->json([
            'status' => 'ok',
            'message' => 'Property updated successfully.',
            'data' => $property,
        ]);
    }

    public function destroy(Property $property): JsonResponse
    {
        $property->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Property deleted successfully.',
        ]);
    }

    private function payload(Request $r, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        $propertyId = $partial && $r->route('property') ? $r->route('property')->id : null;

        return $r->validate([
            'society_id' => 'nullable|exists:societies,id',
            'source_lead_id' => 'nullable|integer|exists:leads,id',
            'owner_name' => 'nullable|string|max:255',
            'owner_phone' => 'nullable|string|max:30',
            'owner_verification_status' => 'nullable|string|max:100',
            'owner_notes' => 'nullable|string|max:5000',
            'title' => "{$req}|string|max:255",
            'slug' => 'nullable|string|max:255|unique:properties,slug' . ($propertyId ? ',' . $propertyId : ''),
            'listing_type' => 'nullable|in:Rent,Sale,Buy / Resale,Sell Listing,Builder Floor',
            'status' => 'nullable|in:Live,Verification,Draft,Archived',
            'society' => 'nullable|string|max:255',
            'locality' => 'nullable|string|max:255',
            'price' => "{$req}|string|max:100",
            'security_deposit' => 'nullable|string|max:100',
            'maintenance' => 'nullable|string|max:100',
            'bedrooms' => 'nullable|integer|min:0|max:10',
            'bathrooms' => 'nullable|integer|min:0|max:10',
            'area_sqft' => 'nullable|integer|min:100|max:20000',
            'floor' => 'nullable|string|max:100',
            'facing' => 'nullable|string|max:100',
            'furnished_status' => 'nullable|in:Semi Furnished,Fully Furnished,Unfurnished',
            'description' => 'nullable|string|max:5000',
            'amenities' => 'nullable|array',
            'amenities.*' => 'string|max:100',
            'images' => 'nullable|array',
            'images.*' => 'string|max:2000',
            'featured' => 'nullable|boolean',
            'verified' => 'nullable|boolean',
        ]);
    }

    private function isAdminRequest(Request $request): bool
    {
        return $request->is('api/admin/*') || $request->is('admin/*');
    }
}
