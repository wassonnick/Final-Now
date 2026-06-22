<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_responses', function (Blueprint $table) {
            $table->id();
            $table->uuid('review_id');
            $table->foreign('review_id')->references('id')->on('reviews')->cascadeOnDelete();
            $table->foreignId('builder_claim_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->text('content');
            $table->string('status')->default('pending');
            $table->text('moderation_notes')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->unique(['review_id', 'builder_claim_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_responses');
    }
};
