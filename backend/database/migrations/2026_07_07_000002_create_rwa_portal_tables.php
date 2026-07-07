<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('builder_claims', function (Blueprint $table) {
            $table->string('claim_type')->default('builder')->index();
            $table->dropUnique(['account_id', 'society_id']);
            $table->unique(['account_id', 'society_id', 'claim_type']);
        });

        Schema::create('rwa_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('society_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('builder_claim_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type')->default('discussion')->index();
            $table->string('category')->default('general')->index();
            $table->string('title');
            $table->text('body');
            $table->string('visibility')->default('public')->index();
            $table->string('priority')->default('normal')->index();
            $table->string('status')->default('pending')->index();
            $table->unsignedInteger('reply_count')->default(0);
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamp('resolved_at')->nullable();
            $table->text('moderation_notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['society_id', 'status', 'published_at']);
        });

        Schema::create('rwa_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rwa_thread_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('builder_claim_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            $table->string('status')->default('pending')->index();
            $table->boolean('is_official')->default(false)->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->text('moderation_notes')->nullable();
            $table->timestamps();
            $table->index(['rwa_thread_id', 'status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rwa_replies');
        Schema::dropIfExists('rwa_threads');
        Schema::table('builder_claims', function (Blueprint $table) {
            $table->dropUnique(['account_id', 'society_id', 'claim_type']);
            $table->unique(['account_id', 'society_id']);
            $table->dropColumn('claim_type');
        });
    }
};
