<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Lead::with(['property', 'society'])->latest();

        if ($user && !$user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('assigned_to_owner_id', $user->id)
                  ->orWhere('assigned_to_broker_id', $user->id);
            });
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'property_id' => 'nullable|uuid|exists:properties,id',
            'society_id' => 'nullable|uuid|exists:societies,id',
            'source' => 'nullable|string|max:50',
            'tenant_name' => 'required|string|max:255',
            'tenant_phone' => 'required|string|max:20',
            'tenant_email' => 'nullable|email',
            'budget_min' => 'nullable|integer',
            'budget_max' => 'nullable|integer',
            'preferred_move_in' => 'nullable|date',
            'requirements_notes' => 'nullable|string',
        ]);

        $validated['source'] = $validated['source'] ?? 'property_page';
        $validated['status'] = 'new';

        $property = null;
        if (!empty($validated['property_id'])) {
            $property = Property::find($validated['property_id']);
            if ($property) {
                $validated['assigned_to_owner_id'] = $property->owner_id;
                $validated['assigned_to_broker_id'] = $property->broker_id;
                $validated['society_id'] = $property->society_id;
            }
        }

        $lead = Lead::create($validated);
        $lead->activities()->create([
            'activity_type' => 'created',
            'description' => 'Lead captured from ' . $validated['source'],
            'metadata' => ['source' => $validated['source']],
        ]);

        if ($property) {
            $property->increment('lead_count');
        }
        if (!empty($validated['society_id'])) {
            Society::where('id', $validated['society_id'])->increment('lead_count');
        }

        return response()->json($lead->load(['property', 'society', 'activities']), 201);
    }
}
