<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Records which axes a comparison actually differs on (sector, builder, price, score,
 * project status). content_quality_score only measures whether fields are filled in —
 * this is what says the page is worth reading, and it makes the auto-publish decision
 * auditable after the fact.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('society_compare_pages', function (Blueprint $table) {
            $table->json('differentiation_signals')->nullable()->after('content_quality_score');
            // Set the first time a page goes live and never cleared, unlike published_at
            // which is nulled whenever a page goes stale. This is how we know a page
            // already owns a URL and must not be held back by rules added later.
            $table->timestamp('first_published_at')->nullable()->after('published_at');
        });

        // Backfill, or every page that is live today would look brand new to the
        // publish gate and could be held back — silently unpublishing pages that
        // already rank. Stale pages were published at some point too (that is what
        // makes them stale), so they keep the exemption using their last update.
        DB::table('society_compare_pages')
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->update(['first_published_at' => DB::raw('published_at')]);

        DB::table('society_compare_pages')
            ->where('status', 'stale')
            ->whereNull('first_published_at')
            ->update(['first_published_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('society_compare_pages', function (Blueprint $table) {
            $table->dropColumn('differentiation_signals');
            $table->dropColumn('first_published_at');
        });
    }
};
