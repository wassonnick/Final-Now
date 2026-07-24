<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Email\SocietyFlatsEmailService;
use App\Services\LeadNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    private function normalizePhone($value): string
    {
        return substr(preg_replace('/\D+/', '', (string) $value), -10);
    }

    private function isValidIndianMobile($value): bool
    {
        return preg_match('/^[6-9]\d{9}$/', $this->normalizePhone($value)) === 1;
    }

    private function invalidPhoneResponse(): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.',
            'errors' => [
                'phone' => ['Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.'],
            ],
        ], 422);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Lead::with(['property.society', 'society', 'linkedProperties'])->latest();
        $operator = $query->getModel()->getConnection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($source = $request->query('source')) {
            $query->where('source', $source);
        }

        if ($request->filled('region_id')) {
            $query->where('region_id', $request->integer('region_id'));
        }

        if ($request->filled('city_id')) {
            $query->where('city_id', $request->integer('city_id'));
        }

        if ($request->filled('target_city')) {
            $query->where('target_city', $operator, (string) $request->query('target_city'));
        }

        if ($search = trim((string) $request->query('q', ''))) {
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
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email|max:255',
            'property_id' => 'nullable|integer|exists:properties,id',
            'society_id' => 'nullable|integer|exists:societies,id',
            'region_id' => 'nullable|integer|exists:regions,id',
            'city_id' => 'nullable|integer|exists:cities,id',
            'zone_id' => 'nullable|integer|exists:zones,id',
            'locality_id' => 'nullable|string|exists:localities,id',
            'property_title' => 'nullable|string|max:255',
            'property_slug' => 'nullable|string|max:255',
            'society_name' => 'nullable|string|max:255',
            'budget' => 'nullable|string|max:255',
            'message' => 'nullable|string',
            'source_page' => 'nullable|string|max:1000',
            'page_url' => 'nullable|string|max:1000',
            'referrer' => 'nullable|string|max:1000',
            'cta_label' => 'nullable|string|max:1000',
            'utm_source' => 'nullable|string|max:1000',
            'utm_medium' => 'nullable|string|max:1000',
            'utm_campaign' => 'nullable|string|max:1000',
            'utm_term' => 'nullable|string|max:1000',
            'utm_content' => 'nullable|string|max:1000',
            'lead_intent' => 'nullable|string|max:1000',
            'search_query' => 'nullable|string|max:1000',
            'ai_query' => 'nullable|string|max:1000',
            'entity_type' => 'nullable|string|max:1000',
            'entity_slug' => 'nullable|string|max:1000',
            'requirement' => 'nullable|string',
            'source' => 'nullable|string|max:255',
            'target_city' => 'nullable|string|max:100',
            'target_locality' => 'nullable|string|max:255',
            'target_zone' => 'nullable|string|max:255',
            'property_intent' => 'nullable|string|max:100',
            'ncr_context' => 'nullable|array',
        ]);

        $phone = $this->normalizePhone($validated['phone'] ?? '');

        if (! $this->isValidIndianMobile($phone)) {
            return $this->invalidPhoneResponse();
        }

        $validated['phone'] = $phone;
        $validated['source'] = $this->normaliseSource($validated['source'] ?? null);
        $validated['status'] = 'New';
        $validated['priority'] = $this->inferPriority($validated);

        $lead = Lead::create($validated);

        app(LeadNotificationService::class)->notifyNewLead($lead);
        app(SocietyFlatsEmailService::class)->sendAdminLeadNotification($lead);
        app(SocietyFlatsEmailService::class)->sendUserLeadConfirmation($lead);

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
            'region_id' => 'nullable|integer|exists:regions,id',
            'city_id' => 'nullable|integer|exists:cities,id',
            'zone_id' => 'nullable|integer|exists:zones,id',
            'locality_id' => 'nullable|string|exists:localities,id',
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
            'target_city' => 'nullable|string|max:100',
            'target_locality' => 'nullable|string|max:255',
            'target_zone' => 'nullable|string|max:255',
            'property_intent' => 'nullable|string|max:100',
            'ncr_context' => 'nullable|array',
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
