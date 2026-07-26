<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminEmailDeliveryController extends Controller
{
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
                'failed' => (int) ($summary['failed'] ?? 0),
                'skipped' => (int) ($summary['skipped'] ?? 0),
            ],
            'data' => $query->paginate(min($request->integer('per_page', 50), 100)),
        ]);
    }
}
