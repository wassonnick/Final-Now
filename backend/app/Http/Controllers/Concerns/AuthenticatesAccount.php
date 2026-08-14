<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Account;
use App\Models\AccountSession;
use Illuminate\Http\Request;

/**
 * The account behind a request, however it arrived.
 *
 * Two shapes of route need this and they are easy to conflate. Everything under /accounts
 * requires an account and the account.api middleware has already resolved one by the time a
 * controller runs. But a handful of public routes — posting a review, submitting a listing,
 * contributing a photo — accept a token when there is one and work fine without, so they
 * still have to look for themselves.
 *
 * Six controllers were each doing the second job by hand, and the copies had drifted: three
 * checked the account was active and three did not, so suspending someone blocked their
 * saved searches while leaving their listings and claims untouched. One implementation is
 * one place to get that right.
 */
trait AuthenticatesAccount
{
    protected function accountFromBearer(Request $request): ?Account
    {
        // Already resolved for a gated route; do not look the same token up twice.
        $resolved = $request->user();

        if ($resolved instanceof Account) {
            return $resolved;
        }

        $token = trim((string) $request->bearerToken());

        // Length-checked before hashing so a stray header costs no database lookup.
        if ($token === '' || strlen($token) < 40) {
            return null;
        }

        $session = AccountSession::findUsable($token);
        $account = $session?->account;

        return $account && $account->status === 'active' ? $account : null;
    }
}
