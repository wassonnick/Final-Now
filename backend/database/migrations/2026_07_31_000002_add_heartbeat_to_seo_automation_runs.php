<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A cycle makes many AI calls and can run for minutes. The web container is also the
 * only scheduler, and on a spun-down free tier it can be killed mid-cycle — leaving a
 * run stuck at status "running" forever with nothing to clean it up.
 *
 * The heartbeat lets recovery tell a long-but-alive run from a dead one, instead of
 * guessing from started_at alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seo_automation_runs', function (Blueprint $table) {
            $table->timestamp('heartbeat_at')->nullable()->after('started_at');
            $table->string('current_phase', 40)->nullable()->after('heartbeat_at');
        });
    }

    public function down(): void
    {
        Schema::table('seo_automation_runs', function (Blueprint $table) {
            $table->dropColumn(['heartbeat_at', 'current_phase']);
        });
    }
};
