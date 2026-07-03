<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OpsDigest;
use App\Services\Ops\AdminOpsInboxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOpsController extends Controller
{
    /**
     * Action Inbox: live operational report plus the latest stored daily
     * digest snapshot. Live compute skips the external sitemap fetch unless
     * explicitly requested, so the dashboard stays fast; the daily digest
     * always includes it.
     */
    public function actionInbox(Request $request, AdminOpsInboxService $inbox): JsonResponse
    {
        $latest = OpsDigest::query()->orderByDesc('digest_date')->first();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'live' => $inbox->build($request->boolean('include_sitemap', false)),
                'last_digest' => $latest ? [
                    'digest_date' => $latest->digest_date->toDateString(),
                    'payload' => $latest->payload,
                ] : null,
            ],
        ]);
    }
}
