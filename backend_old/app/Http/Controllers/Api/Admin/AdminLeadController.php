<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminLeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Lead::with(['property.society', 'society', 'activities'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('tenant_name', 'ILIKE', "%{$search}%")
                  ->orWhere('tenant_phone', 'ILIKE', "%{$search}%")
                  ->orWhere('tenant_email', 'ILIKE', "%{$search}%");
            });
        }

        return response()->json($query->paginate((int) $request->query('per_page', 20)));
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Lead::with(['property.society', 'society', 'activities'])->findOrFail($id));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $lead = Lead::findOrFail($id);
        $validated = $request->validate([
            'status' => 'nullable|string|max:50',
            'requirements_notes' => 'nullable|string',
            'budget_min' => 'nullable|integer',
            'budget_max' => 'nullable|integer',
            'next_follow_up_at' => 'nullable|date',
            'conversion_value' => 'nullable|integer',
        ]);

        $lead->update($validated);

        if (!empty($validated['status'])) {
            $lead->activities()->create([
                'activity_type' => 'status',
                'description' => 'Status changed to ' . $validated['status'],
                'metadata' => ['status' => $validated['status']],
            ]);
        }

        return response()->json($lead->fresh(['property.society', 'society', 'activities']));
    }

    public function addNote(Request $request, string $id): JsonResponse
    {
        $lead = Lead::findOrFail($id);
        $validated = $request->validate([
            'description' => 'required|string',
            'activity_type' => 'nullable|string|max:50',
        ]);

        $activity = $lead->activities()->create([
            'activity_type' => $validated['activity_type'] ?? 'note',
            'description' => $validated['description'],
            'metadata' => [],
        ]);

        return response()->json($activity, 201);
    }

    public function destroy(string $id): JsonResponse
    {
        Lead::findOrFail($id)->delete();
        return response()->json(['message' => 'Lead deleted']);
    }
}
