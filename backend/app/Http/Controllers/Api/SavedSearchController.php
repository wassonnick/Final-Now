<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\SavedSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $account = $this->account($request);
        if (! $account) {
            return $this->unauthorized();
        }

        return response()->json(['data' => $account->savedSearches()->latest()->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $account = $this->account($request);
        if (! $account) {
            return $this->unauthorized();
        }

        $data = $this->validated($request);
        $search = $account->savedSearches()->create($data);

        return response()->json(['message' => 'Search saved.', 'data' => $search], 201);
    }

    public function update(Request $request, SavedSearch $savedSearch): JsonResponse
    {
        $account = $this->account($request);
        if (! $account || $savedSearch->account_id !== $account->id) {
            return $this->unauthorized();
        }

        $savedSearch->update($this->validated($request, true));

        return response()->json(['message' => 'Saved search updated.', 'data' => $savedSearch->fresh()]);
    }

    public function destroy(Request $request, SavedSearch $savedSearch): JsonResponse
    {
        $account = $this->account($request);
        if (! $account || $savedSearch->account_id !== $account->id) {
            return $this->unauthorized();
        }

        $savedSearch->delete();

        return response()->json(['message' => 'Saved search deleted.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:120'],
            'filters' => [$required, 'array', 'max:30'],
            'alert_enabled' => ['sometimes', 'boolean'],
            'alert_channel' => ['sometimes', 'in:whatsapp,email'],
            'alert_frequency' => ['sometimes', 'in:daily,weekly'],
        ]);
    }

    private function account(Request $request): ?Account
    {
        $token = trim((string) $request->bearerToken());
        if ($token === '' || strlen($token) < 40) {
            return null;
        }

        return Account::query()->where('api_token_hash', hash('sha256', $token))->where('status', 'active')->first();
    }

    private function unauthorized(): JsonResponse
    {
        return response()->json(['message' => 'Login with OTP to manage saved searches.'], 401);
    }
}
