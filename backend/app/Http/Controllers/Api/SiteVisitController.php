<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteVisit;
use App\Services\LeadNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SiteVisitController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $visit = SiteVisit::query()->with(['society:id,name,slug', 'property:id,title,slug'])->where('confirmation_token', $token)->firstOrFail();

        return response()->json(['data' => $this->publicPayload($visit)]);
    }

    public function confirm(string $token, Request $request, LeadNotificationService $notifications): JsonResponse
    {
        $visit = SiteVisit::query()->where('confirmation_token', $token)->firstOrFail();
        $data = $request->validate(['selected_slot' => ['required', 'date', 'after:now']]);
        $selected = Carbon::parse($data['selected_slot'])->utc();
        $allowed = collect($visit->proposed_slots)->contains(fn ($slot) => Carbon::parse($slot)->utc()->equalTo($selected));

        if (! $allowed) {
            return response()->json(['message' => 'Select one of the proposed visit slots.'], 422);
        }

        DB::transaction(function () use ($visit, $selected) {
            $visit->update(['selected_slot' => $selected, 'status' => 'confirmed']);
            $visit->lead()->update(['status' => 'Site Visit', 'follow_up_at' => $selected]);
        });
        $notifications->notifySiteVisit($visit->fresh(), 'site_visit_confirmed');

        return response()->json(['message' => 'Site visit confirmed.', 'data' => $this->publicPayload($visit->fresh(['society', 'property']))]);
    }

    private function publicPayload(SiteVisit $visit): array
    {
        return [
            'status' => $visit->status,
            'visitor_name' => $visit->visitor_name,
            'proposed_slots' => $visit->proposed_slots,
            'selected_slot' => optional($visit->selected_slot)->toISOString(),
            'society' => $visit->society ? ['name' => $visit->society->name, 'slug' => $visit->society->slug] : null,
            'property' => $visit->property ? ['title' => $visit->property->title, 'slug' => $visit->property->slug] : null,
        ];
    }
}
