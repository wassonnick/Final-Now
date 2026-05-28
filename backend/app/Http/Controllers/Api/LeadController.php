<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email',
            'property_title' => 'nullable|string',
            'property_slug' => 'nullable|string',
            'society_name' => 'nullable|string',
            'message' => 'nullable|string',
        ]);

        $lead = Lead::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Lead captured successfully',
            'data' => $lead
        ]);
    }
}