<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminPropertyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Property::with(['society.locality'])->latest();

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ILIKE', "%{$search}%")
                  ->orWhere('slug', 'ILIKE', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->query('property_type')) {
            $query->where('property_type', $type);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $property = Property::create($this->validatedPayload($request))->load(['society.locality']);
        return response()->json($property, 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Property::with(['society.builder', 'society.locality'])->findOrFail($id));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $property = Property::findOrFail($id);
        $property->update($this->validatedPayload($request, $property));
        return response()->json($property->fresh(['society.locality']));
    }

    public function destroy(string $id): JsonResponse
    {
        Property::findOrFail($id)->delete();
        return response()->json(['message' => 'Property deleted']);
    }

    private function validatedPayload(Request $request, ?Property $property = null): array
    {
        $validated = $request->validate([
            'society_id' => 'nullable|uuid|exists:societies,id',
            'society' => 'nullable|string|max:255',
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'listing_type' => 'nullable|string|max:50',
            'property_type' => 'nullable|string|max:50',
            'bhk' => 'nullable|integer|min:0',
            'bedrooms' => 'nullable|integer|min:0',
            'bathrooms' => 'nullable|integer|min:0',
            'balconies' => 'nullable|integer|min:0',
            'area_sqft' => 'nullable|numeric|min:0',
            'rent_amount' => 'nullable|integer|min:0',
            'price' => 'nullable',
            'maintenance_amount' => 'nullable|integer|min:0',
            'maintenance' => 'nullable|string|max:255',
            'deposit_months' => 'nullable|integer|min:0',
            'floor_number' => 'nullable|integer',
            'total_floors' => 'nullable|integer',
            'floor' => 'nullable|string|max:100',
            'facing' => 'nullable|string|max:50',
            'furnished_status' => 'nullable|string|max:50',
            'features' => 'nullable|array',
            'amenities' => 'nullable|array',
            'photos' => 'nullable|array',
            'images' => 'nullable|array',
            'floor_plan_url' => 'nullable|string',
            'virtual_tour_url' => 'nullable|string',
            'is_verified' => 'nullable|boolean',
            'verified' => 'nullable|boolean',
            'available_from' => 'nullable|date',
            'is_available' => 'nullable|boolean',
            'status' => 'nullable|string|max:50',
            'featured' => 'nullable|boolean',
            'description' => 'nullable|string',
        ]);

        if (empty($validated['society_id']) && !empty($validated['society'])) {
            $society = Society::firstOrCreate(
                ['slug' => Str::slug($validated['society'])],
                ['name' => $validated['society'], 'status' => 'active']
            );
            $validated['society_id'] = $society->id;
        }
        unset($validated['society']);

        $validated['slug'] = $this->uniqueSlug($validated['slug'] ?? $validated['title'], $property?->id);
        $validated['property_type'] = $validated['property_type'] ?? $this->mapListingType($validated['listing_type'] ?? 'apartment');
        unset($validated['listing_type']);

        if (empty($validated['bhk'])) {
            $validated['bhk'] = (int) ($validated['bedrooms'] ?? 0);
        }

        if (empty($validated['rent_amount'])) {
            $validated['rent_amount'] = $this->moneyToInteger($validated['price'] ?? 0);
        }
        unset($validated['price']);

        if (!empty($validated['maintenance']) && empty($validated['maintenance_amount'])) {
            $validated['maintenance_amount'] = $this->moneyToInteger($validated['maintenance']);
        }
        unset($validated['maintenance']);

        if (!empty($validated['floor']) && empty($validated['floor_number'])) {
            preg_match('/-?\d+/', $validated['floor'], $matches);
            $validated['floor_number'] = isset($matches[0]) ? (int) $matches[0] : null;
        }
        unset($validated['floor']);

        if (!empty($validated['images']) && empty($validated['photos'])) {
            $validated['photos'] = $validated['images'];
        }
        unset($validated['images']);

        if (!empty($validated['amenities']) && empty($validated['features'])) {
            $validated['features'] = ['amenities' => $validated['amenities']];
        }
        unset($validated['amenities']);

        if (isset($validated['verified'])) {
            $validated['is_verified'] = (bool) $validated['verified'];
        }
        unset($validated['verified']);

        if (!empty($validated['description'])) {
            $validated['features'] = array_merge($validated['features'] ?? [], ['description' => $validated['description']]);
        }
        unset($validated['description']);

        $validated['society_id'] = $validated['society_id'] ?? Society::query()->value('id');
        $validated['bhk'] = $validated['bhk'] ?: 0;
        $validated['rent_amount'] = $validated['rent_amount'] ?: 0;
        $validated['status'] = $this->normaliseStatus($validated['status'] ?? 'active');
        $validated['is_available'] = $validated['is_available'] ?? true;
        $validated['featured'] = $validated['featured'] ?? false;
        $validated['is_verified'] = $validated['is_verified'] ?? false;

        return $validated;
    }

    private function mapListingType(string $type): string
    {
        return match (strtolower($type)) {
            'builder floor' => 'builder_floor',
            'buy / resale', 'sell listing' => 'apartment',
            default => 'apartment',
        };
    }

    private function normaliseStatus(string $status): string
    {
        return match (strtolower($status)) {
            'live' => 'active',
            'archived' => 'inactive',
            'verification' => 'draft',
            default => strtolower($status),
        };
    }

    private function moneyToInteger(mixed $value): int
    {
        if (is_numeric($value)) return (int) $value;
        $clean = strtolower((string) $value);
        $number = (float) preg_replace('/[^0-9.]/', '', $clean);
        if (str_contains($clean, 'cr')) return (int) round($number * 10000000);
        if (str_contains($clean, 'l')) return (int) round($number * 100000);
        if (str_contains($clean, 'k')) return (int) round($number * 1000);
        return (int) round($number);
    }

    private function uniqueSlug(string $slug, ?string $ignoreId = null): string
    {
        $base = Str::slug($slug) ?: 'property';
        $candidate = $base;
        $i = 2;

        while (Property::where('slug', $candidate)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $candidate = $base . '-' . $i++;
        }

        return $candidate;
    }
}
