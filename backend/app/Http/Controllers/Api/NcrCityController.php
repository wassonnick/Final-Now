<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Society;
use App\Services\Ncr\NcrCityLaunchPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class NcrCityController extends Controller
{
    public function launchPolicy(string $slug, NcrCityLaunchPolicy $policy): JsonResponse
    {
        $city = City::query()
            ->where('slug', Str::slug($slug))
            ->where('is_active', true)
            ->first();

        if (! $city) {
            return response()->json([
                'status' => 'error',
                'message' => 'NCR city not found.',
            ], 404);
        }

        $isApproved = (bool) config('features.ncr_multicity', false) && $policy->cityIsApproved($city);
        $approvedSocietyCount = Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->where('city_id', $city->id)
            ->count();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'name' => $city->name,
                'slug' => $city->slug,
                'state' => $city->state,
                'city_type' => $city->city_type,
                'is_indexable' => $isApproved,
                'is_sitemap_approved' => $isApproved,
                'is_review_only' => ! $isApproved,
                'canonical_url' => "/ncr/{$city->slug}",
                'indexing_policy' => $isApproved ? 'approved_city_sitemap' : 'held_noindex_until_approved',
                'approved_society_count' => $approvedSocietyCount,
            ],
        ]);
    }
}
