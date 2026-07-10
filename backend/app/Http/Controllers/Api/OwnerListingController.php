<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Lead;
use App\Models\OwnerListing;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Public listing intake for flats and builder floors — the core inventory catcher.
 * Anyone can submit with photos in one pass; a structured OwnerListing is stored (plus a
 * lead so the callback workflow keeps working), and owners can track status from their
 * dashboard. Nothing goes live without admin review + conversion.
 */
class OwnerListingController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'regex:/^[6-9][0-9]{9}$/'],
            'purpose' => ['required', 'in:rent,sale'],
            'listing_type' => ['required', 'in:apartment,builder_floor'],
            'society_id' => ['nullable', 'integer'],
            'society_name' => ['nullable', 'string', 'max:160'],
            'tower' => ['nullable', 'string', 'max:80'],
            'bhk' => ['nullable', 'string', 'max:20'],
            'size_sqft' => ['nullable', 'string', 'max:40'],
            'floor' => ['nullable', 'string', 'max:40'],
            'furnishing' => ['nullable', 'string', 'max:60'],
            'availability' => ['nullable', 'string', 'max:120'],
            'expected_price' => ['nullable', 'string', 'max:60'],
            'details' => ['nullable', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:8'],
            'images.*' => ['url', 'max:500'],
        ]);

        // Attach to an account when one exists (session token, or a known phone) — never block.
        $account = $this->accountFromToken($request)
            ?: Account::where('phone_normalized', $data['phone'])->orWhere('phone', $data['phone'])->first();

        $society = ! empty($data['society_id'])
            ? Society::where('is_published', true)->whereKey($data['society_id'])->first()
            : null;

        // Only accept image URLs that came from our own upload endpoint / storage.
        $images = collect((array) ($data['images'] ?? []))
            ->filter(fn ($url) => str_contains((string) $url, '/storage/listings/'))
            ->values()->all();

        $listing = OwnerListing::create([
            'account_id' => $account?->id,
            'name' => trim($data['name']),
            'phone' => $data['phone'],
            'purpose' => $data['purpose'],
            'listing_type' => $data['listing_type'],
            'society_id' => $society?->id,
            'society_name' => $society?->name ?: ($data['society_name'] ?? null),
            'tower' => $data['tower'] ?? null,
            'bhk' => $data['bhk'] ?? null,
            'size_sqft' => $data['size_sqft'] ?? null,
            'floor' => $data['floor'] ?? null,
            'furnishing' => $data['furnishing'] ?? null,
            'availability' => $data['availability'] ?? null,
            'expected_price' => $data['expected_price'] ?? null,
            'details' => $data['details'] ?? null,
            'images' => $images,
            'status' => 'submitted',
        ]);

        // Keep the existing ops workflow: every listing also lands as a lead for follow-up.
        Lead::create([
            'name' => $listing->name,
            'phone' => $listing->phone,
            'society_id' => $listing->society_id,
            'society_name' => $listing->society_name,
            'property_title' => trim(implode(' · ', array_filter([$listing->bhk ? $listing->bhk.' BHK' : null, $listing->listing_type === 'builder_floor' ? 'Builder Floor' : 'Apartment', $listing->society_name]))) ?: 'Owner listing',
            'source' => 'owner_listing_'.$listing->purpose,
            'requirement' => 'Owner listing — '.($listing->purpose === 'rent' ? 'Rent' : 'Sale'),
            'budget' => $listing->expected_price,
            'message' => "Structured owner listing #{$listing->id} submitted with ".count($images).' photo(s). Review it in Admin → Owner Listings.',
            'status' => 'new',
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Listing received — our team verifies every submission before it goes live. Track it anytime from your dashboard.',
            'data' => $listing,
        ], 201);
    }

    /** Tightly-scoped public image upload for listing photos. */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $disk = config('filesystems.uploads_disk', 'public');
        $path = $request->file('image')->store('listings/'.now()->format('Y/m'), $disk);

        return response()->json([
            'status' => 'ok',
            'data' => ['path' => $path, 'url' => Storage::disk($disk)->url($path)],
        ], 201);
    }

    /** The signed-in account's submissions, for dashboard tracking. */
    public function mine(Request $request): JsonResponse
    {
        $account = $this->accountFromToken($request);
        if (! $account) {
            return response()->json(['message' => 'Login required.'], 401);
        }

        $listings = OwnerListing::query()
            ->where(fn ($q) => $q->where('account_id', $account->id)->orWhere('phone', $account->phone))
            ->latest()
            ->limit(50)
            ->get();

        return response()->json(['status' => 'ok', 'data' => $listings]);
    }

    private function accountFromToken(Request $request): ?Account
    {
        $token = trim((string) preg_replace('/^Bearer\s+/i', '', (string) $request->header('Authorization', '')));
        if ($token === '' || strlen($token) < 40) {
            return null;
        }

        return Account::where('api_token_hash', hash('sha256', $token))->first();
    }
}
