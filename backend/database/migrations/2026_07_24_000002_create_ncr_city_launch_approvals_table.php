<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ncr_city_launch_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->string('city_slug')->unique();
            $table->string('status')->default('held');
            $table->boolean('approved_for_indexing')->default(false);
            $table->boolean('approved_for_sitemap')->default(false);
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->string('approved_by')->nullable();
            $table->string('revoked_by')->nullable();
            $table->text('approval_notes')->nullable();
            $table->json('readiness_snapshot')->nullable();
            $table->timestamps();

            $table->index(['status', 'approved_for_indexing', 'approved_for_sitemap']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ncr_city_launch_approvals');
    }
};
