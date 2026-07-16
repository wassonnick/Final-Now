<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('society_compare_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('h1')->nullable();
            $table->foreignId('society_a_id')->constrained('societies')->cascadeOnDelete();
            $table->foreignId('society_b_id')->constrained('societies')->cascadeOnDelete();
            $table->foreignId('society_c_id')->constrained('societies')->cascadeOnDelete();
            $table->string('comparison_type')->default('nearby_societies');
            $table->string('city')->nullable();
            $table->string('sector_cluster')->nullable();
            $table->text('intro')->nullable();
            $table->text('comparison_summary')->nullable();
            $table->json('best_for_json')->nullable();
            $table->json('comparison_table_json')->nullable();
            $table->json('society_summaries_json')->nullable();
            $table->text('recommendation_copy')->nullable();
            $table->json('faq_json')->nullable();
            $table->json('internal_links_json')->nullable();
            $table->decimal('score', 4, 1)->default(0);
            $table->decimal('content_quality_score', 4, 1)->default(0);
            $table->string('status')->default('needs_review');
            $table->string('generated_by')->default('system');
            $table->string('ai_model')->nullable();
            $table->string('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->text('stale_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'published_at']);
            $table->index(['city', 'sector_cluster']);
            $table->index(['society_a_id', 'society_b_id', 'society_c_id'], 'compare_society_triplet_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('society_compare_pages');
    }
};
