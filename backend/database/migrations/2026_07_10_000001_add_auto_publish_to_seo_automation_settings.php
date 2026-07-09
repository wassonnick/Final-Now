<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Confidence-gated auto-publish for SEO Autopilot: safe, verified-data landing-page drafts
 * (never society pages) can be approved and published by the nightly run itself instead of
 * waiting for a human to click through each one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seo_automation_settings', function (Blueprint $table) {
            $table->boolean('auto_publish_enabled')->default(true)->after('draft_generation_enabled');
            $table->unsignedTinyInteger('auto_publish_min_confidence')->default(80)->after('auto_publish_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('seo_automation_settings', function (Blueprint $table) {
            $table->dropColumn(['auto_publish_enabled', 'auto_publish_min_confidence']);
        });
    }
};
