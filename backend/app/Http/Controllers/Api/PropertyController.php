<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PropertyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Property::with(['society.builder', 'society.locality'])
            ->where('status', 'active')
            ->where('is_available', true);

        if ($request->has('society_id')) {
            $query->where('society_id', $request->society_id);
        }

        if ($request->has('bhk')) {
            $query->where('bhk', $request->bhk);
        }

        if ($request->has('budgetMin') && $request->has('budgetMax')) {
            $query->whereBetween('rent_amount', [$request->budgetMin, $request->budgetMax]);
        }

        if ($request->has('furnished')) {
            $query->where('furnished_status', $request->furnished);
        }

        if ($request->boolean('featured')) {
            $query->where('featured', true);
        }

        return response()->json($query->latest()->paginate((int) $request->query('per_page', 20)));
    }

    public function show(string $slugOrId): JsonResponse
    {
        $property = Property::with(['society.builder', 'society.locality'])
            ->where('slug', $slugOrId)
            ->orWhere('id', $slugOrId)
            ->firstOrFail();

        $property->increment('view_count');

        return response()->json($property);
    }

    public function bySociety(string $societyId): JsonResponse
    {
        $properties = Property::with(['society'])
            ->where('society_id', $societyId)
            ->where('status', 'active')
            ->where('is_available', true)
            ->latest()
            ->get();

        return response()->json($properties);
    }

    public function similar(string $id): JsonResponse
    {
        $property = Property::findOrFail($id);

        $similar = Property::with(['society'])
            ->where('id', '!=', $id)
            ->where('bhk', $property->bhk)
            ->whereBetween('rent_amount', [$property->rent_amount * 0.8, $property->rent_amount * 1.2])
            ->limit(4)
            ->get();

        return response()->json($similar);
    }

    public function shortlist(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Shortlist persistence will be connected in the user module.'], 202);
    }

    public function getShortlist(Request $request): JsonResponse
    {
        return response()->json([]);
    }
}
