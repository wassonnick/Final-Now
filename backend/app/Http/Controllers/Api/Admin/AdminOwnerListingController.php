<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OwnerListing;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminOwnerListingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = OwnerListing::query()->with('society:id,name,slug')->latest();
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['status' => 'ok', 'data' => $query->paginate(min(100, $request->integer('per_page', 25)))]);
    }

    public function update(Request $request, OwnerListing $listing): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:submitted,under_review,approved,rejected'],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $listing->update($data);

        return response()->json(['status' => 'ok', 'message' => 'Listing updated.', 'data' => $listing->fresh()]);
    }

    /**
     * One-click convert: create an unpublished Property draft from the listing (photos,
     * society link, pricing) for the admin to verify and publish through the normal
     * property flow — a submission never goes live without that human pass.
     */
    public function convert(OwnerListing $listing): JsonResponse
    {
        if ($listing->property_id) {
            return response()->json(['message' => 'This listing was already converted to property #'.$listing->property_id.'.'], 422);
        }

        $title = trim(implode(' ', array_filter([
            $listing->bhk ? $listing->bhk.' BHK' : null,
            $listing->listing_type === 'builder_floor' ? 'Builder Floor' : 'Apartment',
            $listing->purpose === 'rent' ? 'for Rent' : 'for Sale',
            $listing->society_name ? 'in '.$listing->society_name : null,
        ]))) ?: 'Owner listing '.$listing->id;

        $property = Property::create([
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(5)),
            'listing_type' => $listing->listing_type === 'builder_floor' ? 'Builder Floor' : ($listing->purpose === 'rent' ? 'Rent' : 'Sale'),
            'status' => 'Draft',
            'verified' => false,
            'society_id' => $listing->society_id,
            'society' => $listing->society_name,
            'locality' => $listing->society?->sector ?: $listing->society?->locality,
            'price' => $listing->expected_price,
            'bedrooms' => (int) preg_replace('/[^0-9]/', '', (string) $listing->bhk) ?: null,
            'area_sqft' => (int) preg_replace('/[^0-9]/', '', (string) $listing->size_sqft) ?: null,
            'furnished_status' => $listing->furnishing,
            'floor' => $listing->floor,
            'description' => trim(implode("\n", array_filter([
                $listing->details,
                $listing->tower ? 'Tower/Block: '.$listing->tower : null,
                $listing->availability ? 'Availability: '.$listing->availability : null,
            ]))),
            'images' => $listing->images ?: [],
            'owner_name' => $listing->name,
            'owner_phone' => $listing->phone,
        ]);

        $listing->update(['status' => 'converted', 'property_id' => $property->id]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Property draft created — verify and publish it from the Properties admin.',
            'data' => ['listing' => $listing->fresh(), 'property_id' => $property->id],
        ], 201);
    }
}
