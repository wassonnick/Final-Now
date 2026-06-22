<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Account;
use Illuminate\Http\Request;

trait AuthenticatesAccount
{
    protected function accountFromBearer(Request $request): ?Account
    {
        $token = trim((string) $request->bearerToken());
        if ($token === '' || strlen($token) < 40) {
            return null;
        }

        return Account::query()->where('api_token_hash', hash('sha256', $token))->where('status', 'active')->first();
    }
}
