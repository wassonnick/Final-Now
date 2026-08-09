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
    /**
     * The market map, as the backend actually sees it.
     *
     * The front end carried this as a hardcoded array, so "Delhi — Launching" was a string
     * in a TypeScript file rather than a claim about the catalogue. Approving a city in
     * admin changed nothing a visitor could see, and the only way to correct the site was
     * to ship a build. A public claim about what is live should come from whatever decides
     * what is live.
     */
    public function index(NcrCityLaunchPolicy $policy): JsonResponse
    {
        $cities = City::query()->where('is_active', true)->orderBy('id')->get();

        $published = Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->whereNotNull('city_id')
            ->selectRaw('city_id, count(*) as c')
            ->groupBy('city_id')
            ->pluck('c', 'city_id');

        $held = Society::query()
            ->whereNotNull('city_id')
            ->selectRaw('city_id, count(*) as c')
            ->groupBy('city_id')
            ->pluck('c', 'city_id');

        return response()->json([
            'status' => 'ok',
            'data' => $cities->map(fn (City $city) => [
                'slug' => $city->slug,
                'name' => $city->name,
                'state' => $city->state,
                'status' => $this->marketStatus($city, $policy, (int) ($published[$city->id] ?? 0), (int) ($held[$city->id] ?? 0)),
                'published_society_count' => (int) ($published[$city->id] ?? 0),
            ])->values(),
        ]);
    }

    /**
     * Live means indexed and open to search, which is the strongest claim the site makes
     * and the one a visitor reads as "you can use this now". Launching means there is real
     * inventory behind the city but it has not cleared that bar. Planned means nothing yet.
     *
     * Deliberately stricter than cityMayPublish(): a city can be open for publishing while
     * it still has one locality, and calling that Live on the homepage would promise a
     * market that does not exist yet.
     */
    private function marketStatus(City $city, NcrCityLaunchPolicy $policy, int $published, int $total): string
    {
        $home = collect((array) config('features.home_city_slugs', []))
            ->map(fn ($value) => Str::slug((string) $value))
            ->contains(Str::slug($city->slug));

        if (($home || $policy->cityIsApproved($city)) && $published > 0) {
            return 'live';
        }

        return $total > 0 ? 'launching' : 'planned';
    }

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
