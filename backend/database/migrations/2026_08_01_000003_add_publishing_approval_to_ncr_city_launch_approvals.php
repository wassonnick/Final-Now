<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Opening a city and indexing a city are two decisions, not one.
 *
 * Until now a city was either fully approved — publishable, indexable and in the sitemap
 * — or entirely shut, and the readiness bar for that single decision is five published
 * societies and three localities. Sensible for indexing: a city page listing one society
 * is thin content and Search Console treats it accordingly.
 *
 * But it makes the first society in a new city impossible to publish, because a city
 * cannot reach five published societies while publishing is what it is waiting for. The
 * bar guards the wrong thing at the wrong moment.
 *
 * Splitting them lets a city be open and working — societies live, city page real — while
 * staying noindex until it has the depth that earns indexing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ncr_city_launch_approvals', function (Blueprint $table) {
            $table->boolean('approved_for_publishing')->default(false)->after('status');
            $table->timestamp('publishing_approved_at')->nullable()->after('approved_for_publishing');
        });

        // Anything already approved for indexing was, by definition, open for business.
        \Illuminate\Support\Facades\DB::table('ncr_city_launch_approvals')
            ->where('approved_for_indexing', true)
            ->update(['approved_for_publishing' => true, 'publishing_approved_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('ncr_city_launch_approvals', function (Blueprint $table) {
            $table->dropColumn(['approved_for_publishing', 'publishing_approved_at']);
        });
    }
};
