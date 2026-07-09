<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Policy singleton for the social autopilot: daily generation on a weekday content calendar,
 * auto-approval and scheduled auto-publish for LOW-risk posts only. Medium/high-risk drafts
 * always wait for a human.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_automation_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->boolean('auto_approve_low_risk')->default(true);
            $table->boolean('auto_publish_low_risk')->default(true);
            $table->boolean('generate_images')->default(true);
            $table->unsignedTinyInteger('posts_per_day')->default(2);
            $table->json('platforms')->nullable();
            $table->json('publish_hours')->nullable();
            $table->string('timezone')->default('Asia/Kolkata');
            $table->timestamp('last_run_at')->nullable();
            $table->json('last_run_summary')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_automation_settings');
    }
};
