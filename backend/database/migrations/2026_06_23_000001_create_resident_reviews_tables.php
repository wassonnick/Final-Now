<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->unsignedInteger('review_count')->default(0);
            $table->decimal('avg_rating', 3, 2)->default(0);
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('society_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('reviewer_name')->nullable();
            $table->decimal('rating', 2, 1);
            $table->string('title');
            $table->text('content');
            $table->decimal('security_rating', 2, 1)->nullable();
            $table->decimal('maintenance_rating', 2, 1)->nullable();
            $table->decimal('amenities_rating', 2, 1)->nullable();
            $table->decimal('connectivity_rating', 2, 1)->nullable();
            $table->decimal('management_rating', 2, 1)->nullable();
            $table->decimal('value_for_money_rating', 2, 1)->nullable();
            $table->unsignedInteger('lived_duration_months')->nullable();
            $table->json('pros')->nullable();
            $table->json('cons')->nullable();
            $table->boolean('is_verified_resident')->default(false);
            $table->string('status', 30)->default('pending');
            $table->text('moderation_notes')->nullable();
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('reported_count')->default(0);
            $table->timestamps();

            $table->unique(['society_id', 'account_id']);
            $table->index(['society_id', 'status']);
        });

        Schema::create('review_helpful_votes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('review_id');
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_helpful')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('review_id')->references('id')->on('reviews')->cascadeOnDelete();
            $table->unique(['review_id', 'account_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_helpful_votes');
        Schema::dropIfExists('reviews');

        Schema::table('societies', function (Blueprint $table) {
            $table->dropColumn(['review_count', 'avg_rating']);
        });
    }
};
