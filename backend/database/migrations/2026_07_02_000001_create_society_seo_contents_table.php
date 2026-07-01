<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('society_seo_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('society_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->string('seo_h1')->nullable();
            $table->text('intro_summary')->nullable();
            $table->longText('about_content')->nullable();
            $table->longText('location_content')->nullable();
            $table->longText('rent_content')->nullable();
            $table->longText('sale_content')->nullable();
            $table->longText('amenities_content')->nullable();
            $table->longText('investment_content')->nullable();
            $table->json('pros_json')->nullable();
            $table->json('cons_json')->nullable();
            $table->json('best_for_json')->nullable();
            $table->json('nearby_highlights_json')->nullable();
            $table->json('faq_json')->nullable();
            $table->json('internal_link_suggestions_json')->nullable();
            $table->json('schema_json')->nullable();
            $table->unsignedInteger('content_score')->default(0);
            $table->unsignedInteger('keyword_score')->default(0);
            $table->unsignedInteger('uniqueness_score')->default(0);
            $table->unsignedInteger('readability_score')->default(0);
            $table->string('status')->default('draft')->index();
            $table->string('generated_by')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('society_seo_contents');
    }
};
