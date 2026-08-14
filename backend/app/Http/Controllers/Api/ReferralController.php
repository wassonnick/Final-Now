<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthenticatesAccount;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Referral;
use App\Services\SubmissionNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ReferralController extends Controller
{
    use AuthenticatesAccount;

    public function index(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account) {
            return response()->json(['message' => 'Unauthorized referral request.'], 401);
        }

        if (! $account->referral_code) {
            $account->update(['referral_code' => $this->uniqueCode()]);
        }

        return response()->json([
            'referral_code' => $account->fresh()->referral_code,
            'policy' => 'Rewards are reviewed manually after a genuine referral converts. Submission does not guarantee a reward.',
            'summary' => [
                'submitted' => $account->referrals()->count(),
                'qualified' => $account->referrals()->whereIn('status', ['qualified', 'converted'])->count(),
                'converted' => $account->referrals()->where('status', 'converted')->count(),
            ],
            'data' => $account->referrals()->latest()->limit(50)->get()->map(fn (Referral $referral) => $this->safePayload($referral)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account) {
            return response()->json(['message' => 'Unauthorized referral request.'], 401);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'intent' => ['required', Rule::in(['rent', 'buy', 'sell'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $phone = $this->normalizePhone($data['phone']);
        if (! preg_match('/^[6-9]\d{9}$/', $phone)) {
            return response()->json(['message' => 'Enter a valid 10-digit Indian mobile number.'], 422);
        }
        if ($phone === $this->normalizePhone($account->phone_normalized ?: $account->phone)) {
            return response()->json(['message' => 'You cannot refer your own phone number.'], 422);
        }
        if (Account::where('phone_normalized', $phone)->exists()) {
            return response()->json(['message' => 'This phone number already has a SocietyFlats account.'], 422);
        }
        $referral = $account->referrals()->firstOrCreate([
            'referred_phone' => $phone,
        ], [
            'referred_name' => trim($data['name']),
            'intent' => $data['intent'],
            'notes' => $data['notes'] ?? null,
        ]);

        if (! $referral->wasRecentlyCreated) {
            return response()->json(['message' => 'This person has already been referred from your account.'], 422);
        }

        app(SubmissionNotificationService::class)->referral($referral, $account);

        return response()->json([
            'message' => 'Referral submitted for admin review. No reward is guaranteed until a genuine conversion is verified.',
            'data' => $this->safePayload($referral->refresh()),
        ], 201);
    }

    private function normalizePhone(mixed $value): string
    {
        return substr(preg_replace('/\D+/', '', (string) $value), -10);
    }

    private function uniqueCode(): string
    {
        do {
            $code = 'SF'.strtoupper(Str::random(8));
        } while (Account::where('referral_code', $code)->exists());

        return $code;
    }

    private function safePayload(Referral $referral): array
    {
        return [
            'id' => $referral->id,
            'name' => $referral->referred_name,
            'phone_last4' => substr($referral->referred_phone, -4),
            'intent' => $referral->intent,
            'status' => $referral->status,
            'reward_status' => $referral->reward_status,
            'created_at' => optional($referral->created_at)->toISOString(),
        ];
    }
}
