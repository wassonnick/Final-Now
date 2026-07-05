<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Services\Ai\SocietyMatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIController extends Controller
{
    public function __construct(private readonly SocietyMatchService $matcher)
    {
    }

    public function advisor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|min:2|max:1000',
            'intent' => 'nullable|string|in:rent,buy,resale,general',
        ]);

        $result = $this->matcher->search(trim($validated['message']), $validated['intent'] ?? null);

        return response()->json(array_merge(['status' => 'ok'], $result));
    }

    public function recommendations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget' => 'nullable|integer|min:10000',
            'officeLocation' => 'nullable|string|max:255',
            'bhk' => 'nullable|integer|min:1|max:5',
            'familySize' => 'nullable|integer|min:1',
            'hasPets' => 'nullable|boolean',
            'priorities' => 'nullable|array|max:5',
        ]);

        $parts = [];
        if (! empty($validated['bhk'])) {
            $parts[] = $validated['bhk'].'BHK';
        }
        if (! empty($validated['officeLocation'])) {
            $parts[] = 'near '.$validated['officeLocation'];
        }
        if (! empty($validated['budget'])) {
            $parts[] = 'under Rs '.$validated['budget'];
        }
        if (! empty($validated['hasPets'])) {
            $parts[] = 'pet friendly';
        }
        foreach (($validated['priorities'] ?? []) as $priority) {
            $parts[] = (string) $priority;
        }

        $result = $this->matcher->search(trim(implode(' ', $parts)) ?: 'Recommend societies in Gurgaon', 'rent');

        return response()->json(array_merge(['status' => 'ok'], $result));
    }

    public function rentEstimate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'societyId' => 'required|exists:societies,id',
            'bhk' => 'required|integer|min:1|max:5',
            'area' => 'required|integer|min:300',
        ]);

        $society = Society::query()
            ->whereKey($validated['societyId'])
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->firstOrFail();
        $bhk = (int) $validated['bhk'];
        $area = (int) $validated['area'];
        $baseRent = $this->matcher->priceFromText($society->average_rent ?: $society->rent_range) ?: (45000 + ($bhk * 18000));
        $score = (float) ($society->score ?: 8.0);
        $scoreMultiplier = 0.85 + (($score / 10) * 0.3);
        $standardArea = max($bhk * 500, 500);
        $areaMultiplier = max(0.75, min(1.4, $area / $standardArea));
        $estimatedRent = (int) round($baseRent * $scoreMultiplier * $areaMultiplier);

        return response()->json([
            'status' => 'ok',
            'estimated_rent' => $estimatedRent,
            'range_min' => (int) round($estimatedRent * 0.9),
            'range_max' => (int) round($estimatedRent * 1.1),
            'factors' => [
                'base_rent' => $baseRent,
                'society_score_multiplier' => round($scoreMultiplier, 2),
                'area_multiplier' => round($areaMultiplier, 2),
            ],
        ]);
    }
}
