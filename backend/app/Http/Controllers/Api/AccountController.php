<?php

namespace App\Http\Controllers\Api;

use Illuminate\Support\Str;
use App\Models\Property;
use App\Models\Lead;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountOtp;
use App\Services\OtpDeliveryService;
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
            'has_account_token' => filled($account->api_token_hash),
        ];
    }


    private function issueAccountToken(Account $account): string
    {
        $plainToken = Str::random(80);

        $account->forceFill([
            'api_token_hash' => hash('sha256', $plainToken),
            'api_token_created_at' => now(),
        ])->save();

        return $plainToken;
    }

    private function accountFromBearer(Request $request): ?Account
    {
        $header = (string) $request->header('Authorization', '');
        $token = trim(preg_replace('/^Bearer\s+/i', '', $header));

        if ($token === '' || strlen($token) < 40) {
            return null;
        }

        return Account::where('api_token_hash', hash('sha256', $token))->first();
    }

    private function safeLeadPayload(Lead $lead): array
    {
        $linkedProperties = $lead->relationLoaded('linkedProperties')
            ? $lead->linkedProperties
            : collect();

        return [
            'id' => $lead->id,
            'source' => $lead->source,
            'society_name' => $lead->society_name,
            'property_title' => $lead->property_title,
            'property_slug' => $lead->property_slug,
            'requirement' => $lead->requirement,
            'budget' => $lead->budget,
            'status' => $lead->status,
            'lead_intent' => $lead->lead_intent,
            'entity_type' => $lead->entity_type,
            'entity_slug' => $lead->entity_slug,
            'linked_properties_count' => $linkedProperties->count(),
            'linked_properties' => $linkedProperties
                ->take(6)
                ->map(fn (Property $property) => $this->safePropertyPayload($property))
                ->values(),
            'created_at' => optional($lead->created_at)->toISOString(),
            'updated_at' => optional($lead->updated_at)->toISOString(),
        ];
    }

    private function safePropertyPayload(Property $property): array
    {
        return [
            'id' => $property->id,
            'title' => $property->title,
            'slug' => $property->slug,
            'society_name' => optional($property->society)->name ?: $property->society,
            'society_slug' => optional($property->society)->slug,
            'locality' => $property->locality,
            'listing_type' => $property->listing_type,
            'status' => $property->status,
            'owner_verification_status' => $property->owner_verification_status,
            'source_lead_id' => $property->source_lead_id,
            'price' => $property->price,
            'bedrooms' => $property->bedrooms,
            'bathrooms' => $property->bathrooms,
            'area_sqft' => $property->area_sqft,
            'furnished_status' => $property->furnished_status,
            'verified' => (bool) $property->verified,
            'public_url' => $property->slug ? '/property/' . $property->slug : null,
            'created_at' => optional($property->created_at)->toISOString(),
            'updated_at' => optional($property->updated_at)->toISOString(),
        ];
    }

    public function dashboard(Request $request)
    {
        $account = $this->accountFromBearer($request);

        if (! $account) {
            return response()->json([
                'message' => 'Unauthorized account dashboard request.',
            ], 401);
        }

        $phone = $this->normalizePhone($account->phone_normalized ?: $account->phone);

        if ($phone === '') {
            return response()->json([
                'message' => 'Account phone is missing.',
            ], 422);
        }

        $baseLeadQuery = Lead::with(['linkedProperties.society'])
            ->where(function ($query) use ($phone) {
                $query->where('phone', 'like', '%' . $phone)
                    ->orWhere('phone', 'like', '%' . $phone . '%');
            });

        $ownerLeadQuery = (clone $baseLeadQuery)
            ->where(function ($query) {
                $query->where('source', 'like', 'owner_listing%')
                    ->orWhere('lead_intent', 'like', 'owner_listing%')
                    ->orWhere('entity_type', 'owner_listing');
            });

        $brokerLeadQuery = (clone $baseLeadQuery)
            ->where(function ($query) {
                $query->where('source', 'like', '%broker%')
                    ->orWhere('message', 'like', '%broker%');
            });

        $propertyQuery = Property::with(['society', 'sourceLead'])
            ->where(function ($query) use ($phone) {
                $query->where('owner_phone', 'like', '%' . $phone)
                    ->orWhere('owner_phone', 'like', '%' . $phone . '%')
                    ->orWhereHas('sourceLead', function ($leadQuery) use ($phone) {
                        $leadQuery->where('phone', 'like', '%' . $phone)
                            ->orWhere('phone', 'like', '%' . $phone . '%');
                    });
            });

        $ownerLeadCount = (clone $ownerLeadQuery)->count();
        $brokerLeadCount = (clone $brokerLeadQuery)->count();
        $propertyCount = (clone $propertyQuery)->count();

        $ownerLeads = (clone $ownerLeadQuery)->latest()->limit(20)->get();
        $brokerLeads = (clone $brokerLeadQuery)->latest()->limit(20)->get();
        $properties = (clone $propertyQuery)->latest()->limit(20)->get();

        return response()->json([
            'account' => $this->accountPayload($account),
            'scope' => [
                'role' => $account->role,
                'phone_normalized' => $phone,
                'privacy' => 'C112D-C protected by bearer token. Owner/broker records are enriched without exposing buyer/tenant contact details.',
            ],
            'summary' => [
                'owner_listing_leads' => $ownerLeadCount,
                'broker_submissions' => $brokerLeadCount,
                'linked_properties' => $propertyCount,
            ],
            'owner_listing_leads' => $ownerLeads->map(fn (Lead $lead) => $this->safeLeadPayload($lead))->values(),
            'broker_submissions' => $brokerLeads->map(fn (Lead $lead) => $this->safeLeadPayload($lead))->values(),
            'linked_properties' => $properties->map(fn (Property $property) => $this->safePropertyPayload($property))->values(),
        ]);
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

        $existingAccount = Account::where('phone_normalized', $phone)->first();

        if ($existingAccount) {
            $payload = [
                'phone' => $existingAccount->phone ?: $phone,
                'last_login_at' => now(),
            ];

            if (! $existingAccount->name && ! empty($validated['name'])) {
                $payload['name'] = $validated['name'];
            }

            if (! $existingAccount->email && ! empty($validated['email'])) {
                $payload['email'] = $validated['email'];
            }

            $incomingMeta = array_filter([
                'last_signup_source' => $validated['source'] ?? null,
                ...($validated['meta'] ?? []),
            ]);

            if ($incomingMeta) {
                $payload['meta'] = array_merge($existingAccount->meta ?: [], [
                    'duplicateSignupAttempted' => true,
                    'duplicateSignupLastAttemptedAt' => now()->toISOString(),
                    'duplicateSignupRoleAttempted' => $validated['role'],
                ], $incomingMeta);
            }

            $existingAccount->update($payload);

            return response()->json([
                'message' => 'This phone number is already registered. Please login or continue with OTP.',
                'existing' => true,
                'account' => $this->accountPayload($existingAccount->fresh()),
            ]);
        }

        $account = Account::create([
            'role' => $validated['role'],
            'phone' => $phone,
            'phone_normalized' => $phone,
            'name' => $validated['name'] ?? null,
            'email' => $validated['email'] ?? null,
            'status' => 'active',
            'last_login_at' => now(),
            'meta' => array_filter([
                'source' => $validated['source'] ?? null,
                ...($validated['meta'] ?? []),
            ]),
        ]);

        return response()->json([
            'message' => 'Account synced.',
            'existing' => false,
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

        $account = Account::where('phone_normalized', $phone)->first();

        if ($account) {
            $payload = [
                'phone' => $account->phone ?: $phone,
                'last_login_at' => now(),
            ];

            if (! $account->name && ! empty($validated['name'])) {
                $payload['name'] = $validated['name'];
            }

            if (! $account->email && ! empty($validated['email'])) {
                $payload['email'] = $validated['email'];
            }

            $account->update($payload);
        } else {
            $account = Account::create([
                'role' => $validated['role'],
                'phone' => $phone,
                'phone_normalized' => $phone,
                'name' => $validated['name'] ?? null,
                'email' => $validated['email'] ?? null,
                'status' => 'otp_pending',
                'last_login_at' => now(),
            ]);
        }

        $code = (string) random_int(100000, 999999);

        $channel = $validated['channel'] ?? 'sms';

        AccountOtp::create([
            'account_id' => $account->id,
            'phone_normalized' => $phone,
            'role' => $validated['role'],
            'code_hash' => Hash::make($code),
            'channel' => $channel,
            'expires_at' => now()->addMinutes(10),
        ]);

        $delivery = app(OtpDeliveryService::class)->send($phone, $code, $channel);

        return response()->json([
            'message' => $delivery['message'] ?? 'OTP generated.',
            'account' => $this->accountPayload($account),
            'delivery' => [
                'attempted' => (bool) ($delivery['attempted'] ?? false),
                'delivered' => (bool) ($delivery['delivered'] ?? false),
                'provider' => $delivery['provider'] ?? 'log',
                'channel' => $delivery['channel'] ?? $channel,
            ],
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

        $account = Account::where('phone_normalized', $phone)->first();

        if ($account) {
            $account->update([
                'phone' => $account->phone ?: $phone,
                'status' => 'active',
                'phone_verified_at' => now(),
                'last_login_at' => now(),
            ]);
        } else {
            $account = Account::create([
                'role' => $validated['role'],
                'phone' => $phone,
                'phone_normalized' => $phone,
                'status' => 'active',
                'phone_verified_at' => now(),
                'last_login_at' => now(),
            ]);
        }

        $accountAccessToken = $this->issueAccountToken($account);

        return response()->json([
            'message' => 'OTP verified.',
            'account' => $this->accountPayload($account),
            'account_access_token' => $accountAccessToken,
        ]);
    }
}
