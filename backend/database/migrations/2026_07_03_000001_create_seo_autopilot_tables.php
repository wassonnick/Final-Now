<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_pages', function (Blueprint $table) {
            $table->id();
            $table->string('page_key')->unique();
            $table->string('page_type')->index();
            $table->string('entity_type')->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('url')->unique();
            $table->string('title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('h1')->nullable();
            $table->string('canonical_url')->nullable();
            $table->boolean('is_indexable')->default(true);
            $table->boolean('sitemap_included')->default(false);
            $table->boolean('is_public')->default(false);
            $table->unsignedInteger('content_word_count')->default(0);
            $table->unsignedInteger('internal_link_count')->default(0);
            $table->unsignedInteger('image_alt_coverage')->default(0);
            $table->json('schema_types')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('freshness_at')->nullable();
            $table->timestamps();
            $table->index(['entity_type', 'entity_id']);
        });

        Schema::create('seo_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seo_page_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('score')->default(0)->index();
            $table->string('status')->default('failed')->index();
            $table->json('breakdown');
            $table->json('issues')->nullable();
            $table->timestamp('checked_at')->index();
            $table->timestamps();
        });

        Schema::create('seo_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seo_page_id')->nullable()->constrained()->nullOnDelete();
            $table->string('task_type')->index();
            $table->string('priority')->default('medium')->index();
            $table->string('status')->default('open')->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('source')->default('audit');
            $table->json('metadata')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('seo_keywords', function (Blueprint $table) {
            $table->id();
            $table->string('keyword')->unique();
            $table->string('cluster_type')->index();
            $table->string('intent')->nullable()->index();
            $table->foreignId('seo_page_id')->nullable()->constrained()->nullOnDelete();
            $table->string('suggested_url')->nullable();
            $table->string('source')->default('system');
            $table->unsignedTinyInteger('difficulty')->nullable();
            $table->unsignedInteger('search_volume')->nullable();
            $table->string('status')->default('mapped')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('seo_search_console_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seo_page_id')->nullable()->constrained()->nullOnDelete();
            $table->date('metric_date')->index();
            $table->string('page_url');
            $table->string('query')->default('');
            $table->unsignedInteger('clicks')->default(0);
            $table->unsignedInteger('impressions')->default(0);
            $table->decimal('ctr', 8, 5)->default(0);
            $table->decimal('position', 8, 2)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->unique(['metric_date', 'page_url', 'query'], 'seo_gsc_metric_unique');
        });

        Schema::create('seo_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seo_page_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('needs_review')->index();
            $table->json('current_version')->nullable();
            $table->json('suggested_version');
            $table->text('reason')->nullable();
            $table->unsignedTinyInteger('confidence_score')->default(0);
            $table->json('data_sources')->nullable();
            $table->json('risk_warnings')->nullable();
            $table->string('generated_by')->default('system');
            $table->string('ai_model')->nullable();
            $table->string('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('seo_change_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seo_page_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('society_seo_content_id')->nullable()->constrained('society_seo_contents')->nullOnDelete();
            $table->string('action')->index();
            $table->string('actor')->nullable();
            $table->json('before_content')->nullable();
            $table->json('after_content')->nullable();
            $table->string('ai_model')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('seo_reports', function (Blueprint $table) {
            $table->id();
            $table->string('period')->index();
            $table->date('period_start');
            $table->date('period_end');
            $table->json('summary');
            $table->string('status')->default('generated');
            $table->timestamp('generated_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_reports');
        Schema::dropIfExists('seo_change_logs');
        Schema::dropIfExists('seo_drafts');
        Schema::dropIfExists('seo_search_console_metrics');
        Schema::dropIfExists('seo_keywords');
        Schema::dropIfExists('seo_tasks');
        Schema::dropIfExists('seo_audits');
        Schema::dropIfExists('seo_pages');
    }
};
