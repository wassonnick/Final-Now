<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $leads = Lead::with(['property', 'society'])
            ->where(function ($q) use ($request) {
                $q->where('assigned_to_owner_id', $request->user()->id)
                  ->orWhere('assigned_to_broker_id', $request->user()->id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($leads);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'property_id' => 'nullable|uuid|exists:properties,id',
            'society_id' => 'nullable|uuid|exists:societies,id',
            'tenant_name' => 'required|string|max:255',
            'tenant_phone' => 'required|string|max:20',
            'tenant_email' => 'nullable|email',
            'requirements_notes' => 'nullable|string',
        ]);

        $validated['source'] = 'property_page';
        $validated['status'] = 'new';

        if ($validated['property_id']) {
            $property = Property::find($validated['property_id']);
            $validated['assigned_to_owner_id'] = $property->owner_id;
            $validated['society_id'] = $property->society_id;
        }

        $lead = Lead::create($validated);

        // Increment lead count on property/society
        if ($validated['property_id']) {
            $property->increment('lead_count');
        }
        if ($validated['society_id']) {
            $society = \App\Models\Society::find($validated['society_id']);
            $society->increment('lead_count');
        }

        return response()->json($lead, 201);
    }
}
