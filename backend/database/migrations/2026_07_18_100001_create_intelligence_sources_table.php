<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intelligence_sources', function (Blueprint $table) {
            $table->id();
            $table->morphs('sourceable');
            $table->string('field_key')->index();
            $table->string('source_type')->default('editorial_research');
            $table->string('source_name');
            $table->text('source_url')->nullable();
            $table->date('source_date')->nullable();
            $table->timestamp('retrieved_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('reviewed_by')->nullable();
            $table->string('verification_status')->default('unverified')->index();
            $table->string('confidence_level')->default('medium');
            $table->text('evidence_excerpt')->nullable();
            $table->text('public_note')->nullable();
            $table->string('attribution')->nullable();
            $table->boolean('is_public')->default(false)->index();
            $table->string('status')->default('draft')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intelligence_sources');
    }
};
