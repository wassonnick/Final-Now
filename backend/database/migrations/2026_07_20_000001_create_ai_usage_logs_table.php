<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 40)->index();
            $table->string('feature', 80)->index();
            $table->string('operation', 120)->nullable();
            $table->string('model', 120)->nullable()->index();
            $table->string('status', 30)->default('succeeded')->index();
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->unsignedInteger('image_count')->default(0);
            $table->decimal('estimated_cost_usd', 12, 6)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->boolean('billable')->default(true);
            $table->string('subject_type', 80)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('request_id', 120)->nullable();
            $table->string('error_class', 180)->nullable();
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['provider', 'created_at']);
            $table->index(['feature', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
    }
};
