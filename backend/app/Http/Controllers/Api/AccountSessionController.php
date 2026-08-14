<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthenticatesAccount;
use App\Http\Controllers\Controller;
use App\Models\AccountSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Somewhere to see and end your own signed-in devices.
 *
 * There was no logout of any kind: signing out cleared the browser and left the token
 * working, so a phone that was lost or sold stayed signed in for ever with nothing to
 * revoke and no way to know it existed.
 */
class AccountSessionController extends Controller
{
    use AuthenticatesAccount;

    public function index(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        $current = $request->attributes->get('account_session');

        return response()->json([
            'sessions' => $account->sessions()->active()->latest('last_used_at')->get()
                ->map(fn (AccountSession $session) => [
                    'id' => $session->id,
                    'device' => $session->device_label,
                    'last_used_at' => $session->last_used_at?->toISOString(),
                    'expires_at' => $session->expires_at?->toISOString(),
                    // So the list can say "this device" instead of asking someone to guess.
                    'is_current' => $current instanceof AccountSession && $current->id === $session->id,
                ])->values(),
        ]);
    }

    /** Ends this device's session only. */
    public function destroy(Request $request): JsonResponse
    {
        $session = $request->attributes->get('account_session');

        if ($session instanceof AccountSession) {
            $session->forceFill(['revoked_at' => now()])->save();
        }

        return response()->json(['message' => 'Signed out on this device.']);
    }

    /** Ends every session, including this one — the thing to do after losing a phone. */
    public function destroyAll(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);

        $count = $account->sessions()->active()->update(['revoked_at' => now()]);

        return response()->json([
            'message' => 'Signed out on all devices.',
            'revoked' => $count,
        ]);
    }

    /** Ends one named device, chosen from the list. */
    public function revoke(Request $request, AccountSession $session): JsonResponse
    {
        $account = $this->accountFromBearer($request);

        // Scoped to the caller: a session id is a small integer and guessing one must not
        // let anybody sign anybody else out.
        if ($session->account_id !== $account->id) {
            return response()->json(['message' => 'That session does not belong to this account.'], 403);
        }

        $session->forceFill(['revoked_at' => now()])->save();

        return response()->json(['message' => 'That device has been signed out.']);
    }
}
