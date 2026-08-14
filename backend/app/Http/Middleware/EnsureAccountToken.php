<?php

namespace App\Http\Middleware;

use App\Models\Account;
use App\Models\AccountSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the signed-in account once, for every route that needs one.
 *
 * Five controllers each parsed the bearer themselves, and the copies had drifted: three
 * never checked the account's status, so suspending someone locked them out of referrals
 * and saved searches while leaving their dashboard, listings, notifications and claims
 * fully usable. A sixth copy skipped the token altogether and read a phone from the query
 * string, which is how a stranger's profile became public.
 *
 * One implementation means one place to get that right, and one place to change it.
 */
class EnsureAccountToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = trim((string) $request->bearerToken());

        // Length-checked before hashing so a stray header cannot cost a database lookup.
        if ($token === '' || strlen($token) < 40) {
            return $this->unauthorized();
        }

        $session = AccountSession::findUsable($token);

        if (! $session) {
            return $this->unauthorized();
        }

        $account = $session->account;

        if (! $account) {
            return $this->unauthorized();
        }

        // A suspended account holds a valid token; the token is not the question.
        if ($account->status !== 'active') {
            return response()->json([
                'message' => 'This account is not active. Contact SocietyFlats support.',
            ], 403);
        }

        $session->touchUsage();

        // Both are resolved here so a controller can end this session without finding it
        // again from a token it should not need to handle.
        $request->attributes->set('account_session', $session);

        // Resolved here so controllers read the account rather than re-deriving it.
        $request->setUserResolver(fn () => $account);

        return $next($request);
    }

    private function unauthorized(): Response
    {
        return response()->json(['message' => 'Login with OTP to continue.'], 401);
    }
}
