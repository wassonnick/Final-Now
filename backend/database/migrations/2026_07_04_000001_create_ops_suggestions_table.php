<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ops_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('society_id')->constrained()->cascadeOnDelete();
            $table->string('kind'); // market_refresh | cover_photo
            $table->string('status')->default('pending'); // pending | applied | dismissed
            $table->json('payload');
            $table->string('created_by')->default('system');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['kind', 'status']);
            $table->index(['society_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ops_suggestions');
    }
};
