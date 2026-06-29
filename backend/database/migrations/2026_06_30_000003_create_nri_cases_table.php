<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nri_cases', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('country', 120);
            $table->string('contact_method', 30);
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('service_type', 40)->index();
            $table->string('property_context')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 40)->default('submitted')->index();
            $table->string('assigned_to')->nullable();
            $table->timestamp('follow_up_at')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamp('consent_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nri_cases');
    }
};
