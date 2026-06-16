<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminAccountController extends Controller
{
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

    public function index(Request $request): JsonResponse
    {
        $query = Account::query()->latest();

        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = trim((string) $request->query('q'))) {
            $query->where(function ($q) use ($search) {
                $driver = config('database.default');
                $operator = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';

                $q->where('name', $operator, "%{$search}%")
                    ->orWhere('phone', $operator, "%{$search}%")
                    ->orWhere('phone_normalized', $operator, "%{$search}%")
                    ->orWhere('email', $operator, "%{$search}%")
                    ->orWhere('role', $operator, "%{$search}%")
                    ->orWhere('status', $operator, "%{$search}%");
            });
        }

        $perPage = max(1, min((int) $request->query('per_page', 50), 100));

        $accounts = $query->paginate($perPage);

        return response()->json([
            'data' => $accounts->getCollection()
                ->map(fn (Account $account) => $this->accountPayload($account))
                ->values(),
            'meta' => [
                'current_page' => $accounts->currentPage(),
                'last_page' => $accounts->lastPage(),
                'per_page' => $accounts->perPage(),
                'total' => $accounts->total(),
            ],
        ]);
    }

    public function show(Account $account): JsonResponse
    {
        return response()->json([
            'account' => $this->accountPayload($account),
        ]);
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['nullable', Rule::in(['customer', 'broker'])],
            'status' => ['nullable', Rule::in(['active', 'otp_pending', 'blocked'])],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'meta' => ['nullable', 'array'],
        ]);

        $payload = [];

        foreach (['role', 'status', 'name', 'email'] as $field) {
            if (array_key_exists($field, $validated)) {
                $payload[$field] = $validated[$field];
            }
        }

        if (array_key_exists('meta', $validated)) {
            $payload['meta'] = array_merge($account->meta ?: [], $validated['meta'] ?: []);
        }

        $account->update($payload);

        return response()->json([
            'message' => 'Account updated.',
            'account' => $this->accountPayload($account->fresh()),
        ]);
    }
}
