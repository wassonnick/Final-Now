<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The log recorded applications, not refreshes.
 *
 * A refresh that produced a suggestion nobody approved wrote nothing at all — yet it had
 * already made the grounded web-search call, which is the expensive part. So AI spend
 * showed market refresh consuming budget while /admin/market-refresh sat empty, and the
 * one question the log exists to answer — is this worth the money — was unanswerable
 * precisely for the runs that cost money and changed nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_refresh_logs', function (Blueprint $table) {
            $table->boolean('applied')->default(true)->after('trigger');
        });
    }

    public function down(): void
    {
        Schema::table('market_refresh_logs', function (Blueprint $table) {
            $table->dropColumn('applied');
        });
    }
};
