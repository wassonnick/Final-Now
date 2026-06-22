<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('society_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('property_id')->nullable()->constrained()->nullOnDelete();
            $table->string('confirmation_token', 80)->unique();
            $table->json('proposed_slots');
            $table->timestamp('selected_slot')->nullable();
            $table->string('status', 30)->default('proposed');
            $table->string('visitor_name');
            $table->string('visitor_phone', 20);
            $table->text('notes')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();

            $table->index(['status', 'selected_slot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_visits');
    }
};
