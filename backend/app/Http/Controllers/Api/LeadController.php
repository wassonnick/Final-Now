<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Lead::with(['property.society', 'society', 'linkedProperties'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($source = $request->query('source')) {
            $query->where('source', $source);
        }

        if ($search = trim((string) $request->query('q', ''))) {
            $operator = $query->getModel()->getConnection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';

            $query->where(function ($q) use ($search, $operator) {
                $q->where('name', $operator, "%{$search}%")
                    ->orWhere('phone', $operator, "%{$search}%")
                    ->orWhere('email', $operator, "%{$search}%")
                    ->orWhere('society_name', $operator, "%{$search}%")
                    ->orWhere('property_title', $operator, "%{$search}%")
                    ->orWhere('message', $operator, "%{$search}%")
                    ->orWhere('budget', $operator, "%{$search}%")
                    ->orWhere('source', $operator, "%{$search}%");
            });
        }

        return response()->json([
            'status' => 'ok',
            'data' => $query->paginate((int) $request->query('per_page', 24)),
        ]);
    }

    public function show(Lead $lead): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $lead->load(['property.society', 'society', 'linkedProperties']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
            'property_id' => 'nullable|integer|exists:properties,id',
            'society_id' => 'nullable|integer|exists:societies,id',
            'property_title' => 'nullable|string|max:255',
            'property_slug' => 'nullable|string|max:255',
            'society_name' => 'nullable|string|max:255',
            'budget' => 'nullable|string|max:255',
            'message' => 'nullable|string',
            'requirement' => 'nullable|string',
            'source' => 'nullable|string|max:255',
        ]);

        $validated['source'] = $this->normaliseSource($validated['source'] ?? null);
        $validated['status'] = 'New';
        $validated['priority'] = $this->inferPriority($validated);

        $lead = Lead::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Lead captured successfully',
            'data' => $lead->fresh(['property.society', 'society']),
        ], 201);
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'email' => 'nullable|email|max:255',
            'property_id' => 'nullable|integer|exists:properties,id',
            'society_id' => 'nullable|integer|exists:societies,id',
            'property_title' => 'nullable|string|max:255',
            'property_slug' => 'nullable|string|max:255',
            'society_name' => 'nullable|string|max:255',
            'budget' => 'nullable|string|max:255',
            'message' => 'nullable|string',
            'requirement' => 'nullable|string',
            'source' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:50',
            'priority' => 'nullable|string|max:50',
            'assigned_to' => 'nullable|string|max:255',
            'follow_up_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if (array_key_exists('source', $validated)) {
            $validated['source'] = $this->normaliseSource($validated['source']);
        }

        $lead->update($validated);

        return response()->json([
            'status' => 'ok',
            'message' => 'Lead updated successfully',
            'data' => $lead->fresh(['property.society', 'society']),
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

    private function normaliseSource(?string $source): string
    {
        $clean = trim((string) $source);

        return $clean !== '' ? $clean : 'Website';
    }

    private function inferPriority(array $lead): string
    {
        $source = strtolower((string) ($lead['source'] ?? ''));
        $message = strtolower((string) (($lead['message'] ?? '') . ' ' . ($lead['requirement'] ?? '')));

        if (str_contains($source, 'property') || str_contains($message, 'visit') || str_contains($message, 'callback')) {
            return 'Hot';
        }

        if (str_contains($source, 'search') || str_contains($source, 'ai')) {
            return 'Warm';
        }

        return 'Warm';
    }
}
