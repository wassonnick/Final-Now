<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('society_intelligence_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('society_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('overall_score', 3, 1)->nullable();
            $table->string('overall_score_label')->nullable();
            $table->string('score_version')->default('c117-v1');
            $table->timestamp('score_calculated_at')->nullable();
            $table->decimal('score_override', 3, 1)->nullable();
            $table->text('score_override_reason')->nullable();
            $table->decimal('liveability_score', 3, 1)->nullable();
            $table->decimal('connectivity_score', 3, 1)->nullable();
            $table->decimal('construction_quality_score', 3, 1)->nullable();
            $table->decimal('maintenance_score', 3, 1)->nullable();
            $table->decimal('builder_reliability_score', 3, 1)->nullable();
            $table->decimal('price_value_score', 3, 1)->nullable();
            $table->decimal('rental_demand_score', 3, 1)->nullable();
            $table->decimal('resale_liquidity_score', 3, 1)->nullable();
            $table->decimal('safety_security_score', 3, 1)->nullable();
            $table->decimal('family_suitability_score', 3, 1)->nullable();
            $table->decimal('legal_rera_confidence_score', 3, 1)->nullable();
            $table->decimal('environmental_resilience_score', 3, 1)->nullable();
            $table->json('score_inputs_json')->nullable();
            $table->json('best_for_json')->nullable();
            $table->json('not_ideal_for_json')->nullable();
            $table->json('top_strengths_json')->nullable();
            $table->json('things_to_verify_json')->nullable();
            $table->text('editorial_summary')->nullable();
            $table->text('score_explanation')->nullable();
            $table->decimal('data_confidence_score', 5, 2)->nullable();
            $table->decimal('data_completeness_score', 5, 2)->nullable();
            $table->unsignedInteger('verified_field_count')->default(0);
            $table->unsignedInteger('estimated_field_count')->default(0);
            $table->unsignedInteger('unverified_field_count')->default(0);
            $table->decimal('evidence_coverage_score', 5, 2)->nullable();
            $table->timestamp('last_intelligence_reviewed_at')->nullable();
            $table->string('intelligence_reviewed_by')->nullable();
            $table->string('intelligence_status')->default('draft')->index();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('society_intelligence_profiles');
    }
};
