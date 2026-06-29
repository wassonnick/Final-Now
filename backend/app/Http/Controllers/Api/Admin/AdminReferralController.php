<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Referral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminReferralController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Referral::with('referrer:id,name,phone_normalized,role')->latest();
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json(['data' => $query->paginate($request->integer('per_page', 50))]);
    }

    public function update(Request $request, Referral $referral): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['submitted', 'contacted', 'qualified', 'rejected', 'converted'])],
            'reward_status' => ['sometimes', Rule::in(['pending', 'approved', 'paid', 'declined'])],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $effectiveStatus = $data['status'] ?? $referral->status;
        if (in_array($data['reward_status'] ?? null, ['approved', 'paid'], true) && $effectiveStatus !== 'converted') {
            return response()->json(['message' => 'A reward can be approved only after the referral is marked converted.'], 422);
        }

        if (($data['status'] ?? null) === 'qualified' && ! $referral->qualified_at) {
            $data['qualified_at'] = now();
        }
        if (($data['status'] ?? null) === 'converted' && ! $referral->converted_at) {
            $data['converted_at'] = now();
        }
        if (($data['reward_status'] ?? null) === 'paid' && ! $referral->rewarded_at) {
            $data['rewarded_at'] = now();
        }

        $referral->update($data);

        return response()->json(['message' => 'Referral review updated.', 'data' => $referral->fresh('referrer')]);
    }
}
