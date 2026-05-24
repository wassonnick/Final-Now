<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AIController extends Controller
{
    public function recommendations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget' => 'required|integer|min:10000',
            'officeLocation' => 'required|string',
            'bhk' => 'required|integer|min:1|max:5',
            'familySize' => 'required|integer|min:1',
            'hasPets' => 'required|boolean',
            'priorities' => 'required|array|min:1|max:3',
        ]);

        $budget = $validated['budget'];
        $bhk = $validated['bhk'];
        $hasPets = $validated['hasPets'];
        $priorities = $validated['priorities'];

        // Get societies within budget range
        $societies = Society::with(['builder', 'locality'])
            ->where('status', 'active')
            ->whereHas('locality', function ($q) use ($budget, $bhk) {
                $q->where("avg_rent_{$bhk}bhk", '<=', $budget * 1.2);
            })
            ->get();

        $recommendations = [];

        foreach ($societies as $society) {
            $matchScore = 0;
            $matchReasons = [];

            // Budget match (30%)
            $avgRent = $society->locality?->{"avg_rent_{$bhk}bhk"} ?? 50000;
            $budgetRatio = $avgRent / $budget;
            if ($budgetRatio <= 1) {
                $matchScore += 30;
                $matchReasons[] = "Within your budget of " . number_format($budget);
            } elseif ($budgetRatio <= 1.1) {
                $matchScore += 20;
                $matchReasons[] = "Slightly above budget but excellent value";
            } else {
                $matchScore += 10;
            }

            // Priority matching (40%)
            foreach ($priorities as $priority) {
                switch ($priority) {
                    case 'security':
                        $score = $society->security_score;
                        $matchScore += ($score / 100) * 13.3;
                        if ($score >= 90) $matchReasons[] = "Exceptional security ({$score}/100)";
                        break;
                    case 'amenities':
                        $score = $society->amenities_score;
                        $matchScore += ($score / 100) * 13.3;
                        if ($score >= 90) $matchReasons[] = "World-class amenities ({$score}/100)";
                        break;
                    case 'connectivity':
                        $score = $society->connectivity_score;
                        $matchScore += ($score / 100) * 13.3;
                        if ($score >= 90) $matchReasons[] = "Excellent connectivity ({$score}/100)";
                        break;
                    case 'family':
                        $score = $society->family_friendly_score;
                        $matchScore += ($score / 100) * 13.3;
                        if ($score >= 85) $matchReasons[] = "Great for families ({$score}/100)";
                        break;
                    case 'pets':
                        $score = $society->pet_friendly_score;
                        $matchScore += ($score / 100) * 13.3;
                        if ($score >= 70) $matchReasons[] = "Pet-friendly policies ({$score}/100)";
                        break;
                    case 'budget':
                        $matchScore += 13.3;
                        break;
                }
            }

            // Pet friendly bonus (10%)
            if ($hasPets && $society->pet_friendly_score >= 70) {
                $matchScore += 10;
                $matchReasons[] = "Welcomes pets ({$society->pet_friendly_score}/100)";
            }

            // Overall score bonus (20%)
            $matchScore += ($society->overall_score / 100) * 20;

            $matchScore = min(round($matchScore), 100);

            if ($matchScore >= 60) {
                $recommendations[] = [
                    'society' => $society,
                    'match_score' => $matchScore,
                    'match_reasons' => array_slice($matchReasons, 0, 4),
                    'rent_estimate' => $avgRent,
                ];
            }
        }

        // Sort by match score
        usort($recommendations, function ($a, $b) {
            return $b['match_score'] <=> $a['match_score'];
        });

        return response()->json(array_slice($recommendations, 0, 5));
    }

    public function rentEstimate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'societyId' => 'required|uuid|exists:societies,id',
            'bhk' => 'required|integer|min:1|max:5',
            'area' => 'required|integer|min:300',
        ]);

        $society = Society::with('locality')->find($validated['societyId']);
        $bhk = $validated['bhk'];
        $area = $validated['area'];

        $baseRent = $society->locality?->{"avg_rent_{$bhk}bhk"} ?? 50000;

        // Adjust based on society score
        $scoreMultiplier = 0.8 + ($society->overall_score / 100) * 0.4;

        // Adjust based on area (standard is 1000 sqft for 2BHK)
        $standardArea = $bhk * 500;
        $areaMultiplier = $area / $standardArea;

        $estimatedRent = round($baseRent * $scoreMultiplier * $areaMultiplier);

        return response()->json([
            'estimated_rent' => $estimatedRent,
            'range_min' => round($estimatedRent * 0.9),
            'range_max' => round($estimatedRent * 1.1),
            'factors' => [
                'base_rent' => $baseRent,
                'society_score_multiplier' => round($scoreMultiplier, 2),
                'area_multiplier' => round($areaMultiplier, 2),
            ]
        ]);
    }
}
