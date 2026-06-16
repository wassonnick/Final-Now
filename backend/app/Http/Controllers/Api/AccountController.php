<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    private function normalizePhone($value): string
    {
        return substr(preg_replace('/\D+/', '', (string) $value), -10);
    }

    private function accountPayload(Account $account): array
    {
        return [
            'id' => $account->id,
            'role' => $account->role,
            'phone' => $account->phone,
            'phone_normalized' => $account->phone_normalized,
            'name' => $account->name,
            'email' => $account->email,
            'status' => $account->status,
            'last_login_at' => optional($account->last_login_at)->toISOString(),
            'phone_verified_at' => optional($account->phone_verified_at)->toISOString(),
            'meta' => $account->meta,
            'created_at' => optional($account->created_at)->toISOString(),
            'updated_at' => optional($account->updated_at)->toISOString(),
        ];
    }

    public function upsert(Request $request)
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['customer', 'broker'])],
            'phone' => ['required', 'string', 'max:30'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'source' => ['nullable', 'string', 'max:120'],
            'meta' => ['nullable', 'array'],
        ]);

        $phone = $this->normalizePhone($validated['phone']);

        if (! preg_match('/^[6-9]\d{9}$/', $phone)) {
            return response()->json([
                'message' => 'Enter a valid 10-digit Indian mobile number.',
            ], 422);
        }

        $account = Account::updateOrCreate(
            ['phone_normalized' => $phone],
            [
                'role' => $validated['role'],
                'phone' => $phone,
                'name' => $validated['name'] ?? null,
                'email' => $validated['email'] ?? null,
                'status' => 'active',
                'last_login_at' => now(),
                'meta' => array_filter([
                    'source' => $validated['source'] ?? null,
                    ...($validated['meta'] ?? []),
                ]),
            ],
        );

        return response()->json([
            'message' => 'Account synced.',
            'account' => $this->accountPayload($account),
        ]);
    }

    public function me(Request $request)
    {
        $phone = $this->normalizePhone($request->query('phone'));

        if (! $phone) {
            return response()->json(['message' => 'Phone is required.'], 422);
        }

        $account = Account::where('phone_normalized', $phone)->first();

        if (! $account) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        return response()->json([
            'account' => $this->accountPayload($account),
        ]);
    }

    public function requestOtp(Request $request)
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['customer', 'broker'])],
            'phone' => ['required', 'string', 'max:30'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'channel' => ['nullable', Rule::in(['sms', 'whatsapp'])],
        ]);

        $phone = $this->normalizePhone($validated['phone']);

        if (! preg_match('/^[6-9]\d{9}$/', $phone)) {
            return response()->json([
                'message' => 'Enter a valid 10-digit Indian mobile number.',
            ], 422);
        }

        $account = Account::updateOrCreate(
            ['phone_normalized' => $phone],
            [
                'role' => $validated['role'],
                'phone' => $phone,
                'name' => $validated['name'] ?? null,
                'email' => $validated['email'] ?? null,
                'status' => 'otp_pending',
                'last_login_at' => now(),
            ],
        );

        $code = (string) random_int(100000, 999999);

        AccountOtp::create([
            'account_id' => $account->id,
            'phone_normalized' => $phone,
            'role' => $validated['role'],
            'code_hash' => Hash::make($code),
            'channel' => $validated['channel'] ?? 'sms',
            'expires_at' => now()->addMinutes(10),
        ]);

        return response()->json([
            'message' => 'OTP generated. SMS/WhatsApp provider will be connected later.',
            'account' => $this->accountPayload($account),
            'dev_otp' => app()->environment('production') ? null : $code,
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['customer', 'broker'])],
            'phone' => ['required', 'string', 'max:30'],
            'otp' => ['required', 'string', 'min:4', 'max:8'],
        ]);

        $phone = $this->normalizePhone($validated['phone']);

        $otp = AccountOtp::where('phone_normalized', $phone)
            ->where('role', $validated['role'])
            ->whereNull('verified_at')
            ->where('expires_at', '>=', now())
            ->latest()
            ->first();

        if (! $otp) {
            return response()->json(['message' => 'OTP expired or not found.'], 422);
        }

        $otp->increment('attempts');

        if ($otp->attempts > 5 || ! Hash::check($validated['otp'], $otp->code_hash)) {
            return response()->json(['message' => 'Invalid OTP.'], 422);
        }

        $otp->update(['verified_at' => now()]);

        $account = Account::updateOrCreate(
            ['phone_normalized' => $phone],
            [
                'role' => $validated['role'],
                'phone' => $phone,
                'status' => 'active',
                'phone_verified_at' => now(),
                'last_login_at' => now(),
            ],
        );

        return response()->json([
            'message' => 'OTP verified.',
            'account' => $this->accountPayload($account),
        ]);
    }
}
