<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('builder_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('society_id')->constrained()->cascadeOnDelete();
            $table->string('organisation_name');
            $table->string('representative_name');
            $table->string('representative_role');
            $table->string('phone', 30);
            $table->string('email')->nullable();
            $table->text('proof_notes');
            $table->string('status')->default('pending');
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['account_id', 'society_id']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('society_announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('builder_claim_id')->constrained()->cascadeOnDelete();
            $table->foreignId('society_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('category')->default('update');
            $table->text('content');
            $table->string('status')->default('pending');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();
            $table->index(['society_id', 'status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('society_announcements');
        Schema::dropIfExists('builder_claims');
    }
};
