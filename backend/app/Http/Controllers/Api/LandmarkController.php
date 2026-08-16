<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Landmark;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The places worth offering as shortcuts, for the city being browsed.
 *
 * The brief builder used to suggest Cyber Hub and Udyog Vihar to somebody looking in
 * Delhi, because the list was hard-coded to Gurgaon. The landmarks table already knows
 * which city each place is in and how often each has been searched, so the shortcuts can
 * come from there and improve on their own as people use them.
 */
class LandmarkController extends Controller
{
    private const LIMIT = 6;

    /**
     * One landmark's landing page, or the index of every landmark worth having one.
     *
     * Serves the same payload the prerenderer bakes into static HTML, so the crawled page
     * and the live page can never describe different societies.
     */
    public function pages(Request $request, \App\Services\Seo\LandmarkPageService $pages, ?string $slug = null): JsonResponse
    {
        if ($slug === null) {
            return response()->json([
                'status' => 'ok',
                'data' => $pages->publishable()->map(fn (Landmark $landmark) => [
                    'name' => $landmark->name,
                    'slug' => $landmark->slug,
                    'city' => $landmark->city,
                    'category' => $landmark->category,
                ])->values(),
            ]);
        }

        $landmark = Landmark::where('slug', $slug)->first();

        if (! $landmark) {
            return response()->json(['status' => 'error', 'message' => 'Landmark not found.'], 404);
        }

        $payload = $pages->payload($landmark);

        // A page with almost nothing on it should not exist, let alone be indexed.
        if ($payload['society_count'] < \App\Services\Seo\LandmarkPageService::MIN_SOCIETIES) {
            return response()->json([
                'status' => 'error',
                'message' => 'Not enough verified societies near this landmark yet.',
            ], 404);
        }

        return response()->json(['status' => 'ok', 'data' => $payload]);
    }

    public function __invoke(Request $request): JsonResponse
    {
        $city = trim((string) $request->query('city', ''));

        $landmarks = Landmark::query()
            ->when($city !== '', fn ($query) => $query->whereIn('city', $this->cityNames($city)))
            // Places people commute to, not places they shop at — a mall is a fine landmark
            // for "near", and a poor answer to "where do you go most days".
            ->whereIn('category', ['office', 'metro', 'corridor', 'airport', 'hospital', 'education', 'locality', 'market'])
            ->orderByDesc('searches')
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get(['name', 'category', 'city']);

        return response()->json([
            'status' => 'ok',
            'data' => $landmarks,
        ]);
    }

    /**
     * Gurgaon and Gurugram are one place, and the catalogue is not consistent about which
     * spelling it stores, so a request for either has to match both.
     */
    private function cityNames(string $city): array
    {
        $aliases = [
            'gurgaon' => ['Gurgaon', 'Gurugram'],
            'gurugram' => ['Gurgaon', 'Gurugram'],
            'delhi' => ['Delhi', 'New Delhi'],
            'new delhi' => ['Delhi', 'New Delhi'],
            'noida' => ['Noida'],
            'greater noida' => ['Greater Noida', 'Noida'],
        ];

        return $aliases[mb_strtolower($city)] ?? [$city];
    }
}
