<?php

namespace Tests;

use App\Models\Account;
use App\Models\AccountSession;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    //

    /**
     * Marks an account as signed in on one device with a known token.
     *
     * Fixtures used to set accounts.api_token_hash directly, which stopped being how a
     * session exists once devices got their own rows. Kept as a helper rather than repeated
     * inline so the next test does not reinvent a third way of being logged in.
     */
    protected function sessionFor(Account $account, string $plainToken): Account
    {
        AccountSession::create([
            'account_id' => $account->id,
            'token_hash' => hash('sha256', $plainToken),
            'device_label' => 'Test device',
            'last_used_at' => now(),
            'expires_at' => now()->addDays(60),
        ]);

        return $account;
    }
}
