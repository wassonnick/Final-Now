<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PropertyController extends Controller
{
    private const INTERNAL_FIELDS = [
        'source_lead_id',
        'owner_name',
        'owner_phone',
        'owner_verification_status',
        'owner_notes',
        'unit_number',
        'source_lead',
    ];

    public function index(Request $request): JsonResponse
    {
        $isAdmin = $this->isAdminRequest($request);
        $q = Property::query()->with($isAdmin ? ['society', 'sourceLead'] : ['society']);

        if (! $isAdmin) {
            $q->publiclyAvailable();
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

        $properties = $q->latest()->paginate($request->integer('per_page', 24));
        if (! $isAdmin) {
            $properties->getCollection()->each->makeHidden(self::INTERNAL_FIELDS);
        }

        return response()->json([
            'status' => 'ok',
            'data' => $properties,
        ]);
    }

    public function show(Request $request, string $idOrSlug): JsonResponse
    {
        $isAdmin = $this->isAdminRequest($request);
        $query = Property::with($isAdmin ? ['society', 'sourceLead'] : ['society']);

        if (! $isAdmin) {
            $query->publiclyAvailable();
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

    if (! $isAdmin) {
        $property->makeHidden(self::INTERNAL_FIELDS);
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

        $p = $this->applyPublicationRules($p);

        $property = Property::create($p)->refresh();

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

        $p = $this->applyPublicationRules($p, $property);

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
        $propertyId = $partial && $r->route('property') ? $r->route('property')->id : null;

        $payload = $r->validate([
            'society_id' => 'nullable|exists:societies,id',
            'source_lead_id' => 'nullable|integer|exists:leads,id',
            'owner_name' => 'nullable|string|max:255',
            'owner_phone' => 'nullable|string|max:30',
            'owner_verification_status' => 'nullable|string|max:100',
            'owner_notes' => 'nullable|string|max:5000',
            'title' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255|unique:properties,slug' . ($propertyId ? ',' . $propertyId : ''),
            'listing_type' => 'nullable|in:Rent,Sale,Rent + Sale,Buy / Resale,Sell Listing,Builder Floor',
            'listing_purpose' => 'nullable|in:Rent,Sale,Rent + Sale,rent,sale,rent_sale',
            'property_type' => 'nullable|string|max:100',
            'status' => 'nullable|in:Live,Verification,Draft,Archived',
            'society' => 'nullable|string|max:255',
            'locality' => 'nullable|string|max:255',
            'sector' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'tower' => 'nullable|string|max:100',
            'unit_number' => 'nullable|string|max:100',
            'price' => 'nullable|string|max:100',
            'rent_amount' => 'nullable|numeric|min:0',
            'rent_unit' => 'nullable|in:monthly',
            'sale_price' => 'nullable|numeric|min:0',
            'sale_price_unit' => 'nullable|in:total',
            'price_per_sqft' => 'nullable|numeric|min:0',
            'security_deposit' => 'nullable|string|max:100',
            'maintenance' => 'nullable|string|max:100',
            'maintenance_included' => 'nullable|boolean',
            'maintenance_amount' => 'nullable|numeric|min:0',
            'maintenance_unit' => 'nullable|in:monthly',
            'bedrooms' => 'nullable|integer|min:0|max:10',
            'bathrooms' => 'nullable|integer|min:0|max:10',
            'balconies' => 'nullable|integer|min:0|max:20',
            'area_sqft' => 'nullable|numeric|min:0|max:20000',
            'super_area' => 'nullable|numeric|min:0|max:20000',
            'carpet_area_sqft' => 'nullable|numeric|min:0|max:20000',
            'floor' => 'nullable|string|max:100',
            'facing' => 'nullable|string|max:100',
            'furnished_status' => 'nullable|in:Semi Furnished,Fully Furnished,Unfurnished',
            'available_from' => 'nullable|date',
            'description' => 'nullable|string|max:5000',
            'amenities' => 'nullable|array',
            'amenities.*' => 'string|max:100',
            'inherited_society_amenities' => 'nullable|array',
            'inherited_society_amenities.*' => 'string|max:100',
            'property_amenities' => 'nullable|array',
            'property_amenities.*' => 'string|max:100',
            'images' => 'nullable|array',
            'images.*' => 'string|max:2000',
            'virtual_tour_url' => 'nullable|url|max:2000',
            'floor_plan_url' => 'nullable|url|max:2000',
            'featured' => 'nullable|boolean',
            'verified' => 'nullable|boolean',
        ]);

        return $this->normaliseSimplifiedPayload($payload, $partial);
    }

    private function normaliseSimplifiedPayload(array $payload, bool $partial): array
    {
        foreach (['title', 'society', 'locality', 'sector', 'city', 'tower', 'unit_number', 'price', 'security_deposit', 'maintenance', 'description'] as $field) {
            if (array_key_exists($field, $payload) && is_string($payload[$field])) {
                $payload[$field] = trim(preg_replace('/\s+/', ' ', $payload[$field]) ?: $payload[$field]);
            }
        }

        if (! empty($payload['listing_purpose']) && empty($payload['listing_type'])) {
            $payload['listing_type'] = match (strtolower((string) $payload['listing_purpose'])) {
                'rent' => 'Rent',
                'sale' => 'Sale',
                'rent_sale' => 'Rent + Sale',
                default => $payload['listing_purpose'],
            };
        }
        unset($payload['listing_purpose']);

        if (! $partial || array_key_exists('listing_type', $payload)) {
            $payload['listing_type'] = $payload['listing_type'] ?? 'Rent';
        }
        if (! $partial || array_key_exists('property_type', $payload)) {
            $payload['property_type'] = trim((string) ($payload['property_type'] ?? 'Apartment')) ?: 'Apartment';
        }
        if (! $partial || array_key_exists('city', $payload)) {
            $payload['city'] = trim((string) ($payload['city'] ?? 'Gurugram')) ?: 'Gurugram';
        }

        if (array_key_exists('super_area', $payload) && ! array_key_exists('area_sqft', $payload)) {
            $payload['area_sqft'] = $payload['super_area'];
        }
        unset($payload['super_area']);

        $society = null;
        if (! empty($payload['society_id'])) {
            $society = Society::query()->find($payload['society_id']);
        } elseif (! empty($payload['society'])) {
            $society = Society::where('name', $payload['society'])->first();
            if ($society) {
                $payload['society_id'] = $society->id;
            }
        }

        if ($society) {
            $payload['society'] = ($payload['society'] ?? null) ?: $society->name;
            $payload['sector'] = ($payload['sector'] ?? null) ?: $society->sector;
            $payload['locality'] = ($payload['locality'] ?? null) ?: $society->locality;
            $payload['city'] = ($payload['city'] ?? null) ?: ($society->city ?: 'Gurugram');
            $payload['inherited_society_amenities'] = $this->cleanArray($payload['inherited_society_amenities'] ?? $society->amenities);
        }

        if (array_key_exists('property_amenities', $payload) || array_key_exists('amenities', $payload) || ! $partial) {
            $payload['property_amenities'] = $this->cleanArray($payload['property_amenities'] ?? ($payload['amenities'] ?? []));
        }
        if (! empty($payload['property_amenities'])) {
            $payload['amenities'] = $payload['property_amenities'];
        }

        if (! $partial || array_key_exists('rent_amount', $payload) || array_key_exists('rent_unit', $payload)) {
            $payload['rent_unit'] = 'monthly';
        }
        if (! $partial || array_key_exists('sale_price', $payload) || array_key_exists('sale_price_unit', $payload)) {
            $payload['sale_price_unit'] = 'total';
        }
        if (! $partial || array_key_exists('maintenance_amount', $payload) || array_key_exists('maintenance_unit', $payload)) {
            $payload['maintenance_unit'] = 'monthly';
        }

        if (isset($payload['rent_amount'])) {
            $payload['rent_amount'] = (int) round((float) $payload['rent_amount']);
        }
        if (isset($payload['sale_price'])) {
            $payload['sale_price'] = (int) round((float) $payload['sale_price']);
        }
        if (isset($payload['maintenance_amount'])) {
            $payload['maintenance_amount'] = (int) round((float) $payload['maintenance_amount']);
        }

        $listingType = strtolower((string) ($payload['listing_type'] ?? ''));
        if (! trim((string) ($payload['price'] ?? ''))) {
            if (str_contains($listingType, 'rent') && ! empty($payload['rent_amount'])) {
                $payload['price'] = '₹'.number_format((int) $payload['rent_amount']).'/month';
            } elseif ((str_contains($listingType, 'sale') || str_contains($listingType, 'sell') || str_contains($listingType, 'resale')) && ! empty($payload['sale_price'])) {
                $payload['price'] = '₹'.number_format((int) $payload['sale_price']);
            }
        }

        if (empty($payload['price_per_sqft']) && ! empty($payload['sale_price']) && ! empty($payload['area_sqft'])) {
            $area = (float) $payload['area_sqft'];
            if ($area > 0) {
                $payload['price_per_sqft'] = (int) round(((int) $payload['sale_price']) / $area);
            }
        }

        $locationPresent = ! empty($payload['society_id']) || trim((string) ($payload['locality'] ?? '')) !== '' || trim((string) ($payload['sector'] ?? '')) !== '';
        if (! $partial && (! trim((string) ($payload['listing_type'] ?? '')) || ! trim((string) ($payload['property_type'] ?? '')) || ! $locationPresent)) {
            throw ValidationException::withMessages([
                'location' => ['Provide listing type, property type and either society, locality or sector.'],
            ]);
        }

        if ((! $partial || array_key_exists('title', $payload)) && empty($payload['title'])) {
            $payload['title'] = $this->generatedTitle($payload);
        }

        return $payload;
    }

    private function isAdminRequest(Request $request): bool
    {
        return $request->is('api/admin/*') || $request->is('admin/*');
    }

    private function applyPublicationRules(array $payload, ?Property $property = null): array
    {
        $effective = array_merge($property?->toArray() ?? [], $payload);
        $status = (string) ($effective['status'] ?? 'Draft');

        if ($status !== 'Live') {
            if (array_key_exists('status', $payload)) {
                $payload['published_at'] = null;
            }
            if (array_key_exists('verified', $payload) && ! $payload['verified']) {
                $payload['verified_at'] = null;
                $payload['availability_checked_at'] = null;
            }

            return $payload;
        }

        $errors = [];
        $society = ! empty($effective['society_id'])
            ? Society::query()->find($effective['society_id'])
            : null;

        if (! $society || ! $society->is_published || ! in_array($society->status, ['Verified', 'Premium'], true)) {
            $errors['society_id'][] = 'Choose a published, verified society before publishing this property.';
        }
        if (trim((string) ($effective['listing_type'] ?? '')) === '') {
            $errors['listing_type'][] = 'Listing type is required before publishing.';
        }
        if (trim((string) ($effective['price'] ?? '')) === '' && empty($effective['rent_amount']) && empty($effective['sale_price'])) {
            $errors['price'][] = 'A rent or sale price is required before publishing.';
        }
        if (! ($effective['verified'] ?? false)) {
            $errors['verified'][] = 'Verify the owner and property details before publishing.';
        }
        if (trim((string) ($effective['owner_name'] ?? '')) === '') {
            $errors['owner_name'][] = 'Owner or authorised broker name is required before publishing.';
        }
        $phone = preg_replace('/\D+/', '', (string) ($effective['owner_phone'] ?? ''));
        if (strlen($phone) < 10) {
            $errors['owner_phone'][] = 'A valid owner or authorised broker phone is required before publishing.';
        }

        $images = array_values(array_filter((array) ($effective['images'] ?? [])));
        if ($images === []) {
            $errors['images'][] = 'Upload at least one real property photo before publishing.';
        } elseif (collect($images)->contains(fn ($image) => str_contains((string) $image, 'images.unsplash.com/photo-1600607687939'))) {
            $errors['images'][] = 'The stock placeholder cannot be published as a property photo.';
        }

        if (($effective['listing_type'] ?? null) === 'Rent' && trim((string) ($effective['security_deposit'] ?? '')) === '') {
            $errors['security_deposit'][] = 'Security deposit is required before publishing a rental property.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $payload['verified_at'] = $property?->verified_at ?: now();
        $payload['availability_checked_at'] = now();
        $payload['published_at'] = $property?->published_at ?: now();
        $payload['owner_verification_status'] = 'Verified';

        return $payload;
    }

    private function cleanArray(mixed $value): array
    {
        if (is_null($value) || $value === '') return [];
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = json_last_error() === JSON_ERROR_NONE ? $decoded : preg_split('/,|;|\r?\n/', $value);
        }

        return collect(is_array($value) ? $value : [])
            ->flatMap(function ($item) {
                if (is_string($item)) {
                    $decoded = json_decode($item, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) return $decoded;
                    return preg_split('/,|;|\r?\n/', $item) ?: [];
                }
                return [is_array($item) ? ($item['name'] ?? $item['title'] ?? null) : $item];
            })
            ->map(fn ($item) => trim(strip_tags((string) $item)))
            ->filter(fn ($item) => $item !== '' && mb_strlen($item) <= 100)
            ->unique(fn ($item) => mb_strtolower($item))
            ->values()
            ->all();
    }

    private function generatedTitle(array $payload): string
    {
        $bedrooms = trim((string) ($payload['bedrooms'] ?? ''));
        $type = trim((string) ($payload['property_type'] ?? 'Apartment')) ?: 'Apartment';
        $listing = strtolower((string) ($payload['listing_type'] ?? 'Rent'));
        $intent = str_contains($listing, 'sale') || str_contains($listing, 'sell') || str_contains($listing, 'resale') ? 'Sale' : 'Rent';
        $location = trim((string) ($payload['society'] ?? ''))
            ?: trim((string) ($payload['sector'] ?? ''))
            ?: trim((string) ($payload['locality'] ?? ''))
            ?: trim((string) ($payload['city'] ?? 'Gurugram'));
        $sector = trim((string) ($payload['sector'] ?? ''));
        $suffix = $sector && $location !== $sector ? "{$location}, {$sector}" : $location;

        return trim(implode(' ', array_filter([
            $bedrooms !== '' && $type !== 'Builder Floor' ? "{$bedrooms} BHK" : null,
            $type,
            'for',
            $intent,
            'in',
            $suffix ?: 'Gurugram',
        ])));
    }
}
