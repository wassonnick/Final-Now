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
            'virtual_tour_url' => 'nullable|url|max:2000',
            'floor_plan_url' => 'nullable|url|max:2000',
            'featured' => 'nullable|boolean',
            'verified' => 'nullable|boolean',
        ]);
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
}
