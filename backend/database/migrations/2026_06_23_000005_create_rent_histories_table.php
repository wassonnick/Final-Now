<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rent_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('society_id')->constrained()->cascadeOnDelete();
            $table->date('recorded_on');
            $table->unsignedTinyInteger('bhk')->nullable();
            $table->unsignedInteger('min_rent')->nullable();
            $table->unsignedInteger('median_rent');
            $table->unsignedInteger('max_rent')->nullable();
            $table->unsignedInteger('sample_size')->nullable();
            $table->string('source_name');
            $table->text('source_url')->nullable();
            $table->unsignedTinyInteger('confidence_score')->nullable();
            $table->string('status')->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['society_id', 'recorded_on', 'bhk']);
            $table->index(['status', 'recorded_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rent_histories');
    }
};
