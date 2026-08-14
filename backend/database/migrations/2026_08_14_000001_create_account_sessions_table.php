<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One row per signed-in device, replacing the single token column on accounts.
 *
 * That column held exactly one hash, written afresh on every login, and it never expired.
 * Three things followed. Signing in on a phone silently signed you out of a laptop, because
 * the second login overwrote the first. There was no logout at all — nothing anywhere set
 * the column back to null. And a token copied off a device kept working for ever, with no
 * way to see it existed or take it away.
 *
 * Existing tokens are carried across rather than dropped, so nobody is signed out by the
 * deploy that fixes this.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            // What the person would recognise in a list of their own sessions.
            $table->string('device_label')->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('revoked_at')->nullable()->index();
            $table->timestamps();

            $table->index(['account_id', 'revoked_at']);
        });

        // Carry the current tokens over. Their real age is unknown for rows that predate
        // api_token_created_at, so they are given the standard lifetime from now: a person
        // staying signed in slightly longer is better than signing out the whole user base
        // to fix a bug they never saw.
        $lifetime = (int) config('services.accounts.session_days', 60);

        foreach (DB::table('accounts')->whereNotNull('api_token_hash')->get(['id', 'api_token_hash', 'api_token_created_at']) as $account) {
            DB::table('account_sessions')->insert([
                'account_id' => $account->id,
                'token_hash' => $account->api_token_hash,
                'device_label' => 'Carried over from before sessions',
                'last_used_at' => $account->api_token_created_at,
                'expires_at' => now()->addDays($lifetime),
                'created_at' => $account->api_token_created_at ?: now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('account_sessions');
    }
};
