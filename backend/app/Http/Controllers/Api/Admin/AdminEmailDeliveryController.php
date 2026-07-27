<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailDelivery;
use App\Services\Email\SocietyFlatsEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminEmailDeliveryController extends Controller
{
    public function sendTest(SocietyFlatsEmailService $email): JsonResponse
    {
        $recipient = trim((string) (
            config('services.societyflats_email.lead_alert_email')
            ?: config('services.societyflats_email.admin_email')
            ?: ''
        ));

        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'message' => 'Configure the SocietyFlats admin email before sending a test.',
            ], 422);
        }

        $result = $email->sendTestEmail($recipient);

        return response()->json([
            'message' => $result['message'],
        ], $result['sent'] ? 202 : 502);
    }

    public function index(Request $request): JsonResponse
    {
        $query = EmailDelivery::query()->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('message_type')) {
            $query->where('message_type', $request->string('message_type'));
        }

        $summary = EmailDelivery::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'summary' => [
                'sent' => (int) ($summary['sent'] ?? 0),
                'delivered' => (int) ($summary['delivered'] ?? 0),
                'delayed' => (int) ($summary['delayed'] ?? 0),
                'bounced' => (int) ($summary['bounced'] ?? 0),
                'complained' => (int) ($summary['complained'] ?? 0),
                'suppressed' => (int) ($summary['suppressed'] ?? 0),
                'failed' => (int) ($summary['failed'] ?? 0),
                'skipped' => (int) ($summary['skipped'] ?? 0),
            ],
            'data' => $query->paginate(min($request->integer('per_page', 50), 100)),
        ]);
    }
}
