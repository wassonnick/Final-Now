<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_automation_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->boolean('audit_enabled')->default(true);
            $table->boolean('technical_checks_enabled')->default(true);
            $table->boolean('search_console_enabled')->default(true);
            $table->boolean('keyword_refresh_enabled')->default(true);
            $table->boolean('draft_generation_enabled')->default(true);
            $table->boolean('reports_enabled')->default(true);
            $table->unsignedTinyInteger('drafts_per_run')->default(5);
            $table->string('timezone')->default('Asia/Kolkata');
            $table->timestamps();
        });

        Schema::create('seo_automation_runs', function (Blueprint $table) {
            $table->id();
            $table->string('trigger')->default('scheduled')->index();
            $table->string('status')->default('running')->index();
            $table->timestamp('started_at')->index();
            $table->timestamp('finished_at')->nullable();
            $table->json('summary')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_automation_runs');
        Schema::dropIfExists('seo_automation_settings');
    }
};
