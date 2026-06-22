<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\SiteVisit;
use App\Services\LeadNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class AdminSiteVisitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SiteVisit::query()->with(['lead:id,name,phone,society_name,property_title', 'society:id,name,slug', 'property:id,title,slug'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->paginate(max(1, min($request->integer('per_page', 50), 100))));
    }

    public function store(Request $request, LeadNotificationService $notifications): JsonResponse
    {
        $data = $request->validate([
            'lead_id' => ['required', 'integer', 'exists:leads,id'],
            'proposed_slots' => ['required', 'array', 'min:1', 'max:5'],
            'proposed_slots.*' => ['required', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $lead = Lead::findOrFail($data['lead_id']);
        $slots = collect($data['proposed_slots'])->map(fn ($slot) => Carbon::parse($slot)->utc()->toISOString())->unique()->values()->all();

        $visit = SiteVisit::create([
            'lead_id' => $lead->id,
            'society_id' => $lead->society_id,
            'property_id' => $lead->property_id,
            'confirmation_token' => Str::random(64),
            'proposed_slots' => $slots,
            'status' => 'proposed',
            'visitor_name' => $lead->name,
            'visitor_phone' => $lead->phone,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        $notifications->notifySiteVisit($visit, 'site_visit_proposed');

        return response()->json([
            'message' => 'Site visit slots created.',
            'data' => $visit->load(['lead', 'society', 'property']),
            'confirmation_url' => rtrim((string) config('services.lead_notifications.frontend_url', config('app.url')), '/').'/visit/'.$visit->confirmation_token,
        ], 201);
    }

    public function update(Request $request, SiteVisit $siteVisit): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:proposed,confirmed,completed,cancelled'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);
        $siteVisit->update($data);

        return response()->json(['message' => 'Site visit updated.', 'data' => $siteVisit->fresh(['lead', 'society', 'property'])]);
    }

    public function remind(SiteVisit $siteVisit, LeadNotificationService $notifications): JsonResponse
    {
        if ($siteVisit->status !== 'confirmed' || ! $siteVisit->selected_slot) {
            return response()->json(['message' => 'Only confirmed visits can receive reminders.'], 422);
        }

        $notifications->notifySiteVisit($siteVisit, 'site_visit_reminder');
        $siteVisit->update(['reminder_sent_at' => now()]);

        return response()->json(['message' => 'Reminder queued through the configured notification webhook.', 'data' => $siteVisit->fresh()]);
    }
}
