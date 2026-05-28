<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => Lead::latest()->paginate(24),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email',
            'property_title' => 'nullable|string',
            'property_slug' => 'nullable|string',
            'society_name' => 'nullable|string',
            'message' => 'nullable|string',
            'source' => 'nullable|string|max:255',
        ]);

        $lead = Lead::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Lead captured successfully',
            'data' => $lead,
        ], 201);
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'email' => 'nullable|email',
            'property_title' => 'nullable|string',
            'property_slug' => 'nullable|string',
            'society_name' => 'nullable|string',
            'message' => 'nullable|string',
            'source' => 'nullable|string|max:255',
        ]);

        $lead->update($validated);

        return response()->json([
            'status' => 'ok',
            'message' => 'Lead updated successfully',
            'data' => $lead,
        ]);
    }

    public function destroy(Lead $lead): JsonResponse
    {
        $lead->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Lead deleted successfully',
        ]);
    }
}