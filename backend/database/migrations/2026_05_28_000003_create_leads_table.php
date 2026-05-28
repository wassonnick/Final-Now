<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up(): void { Schema::create('leads', function (Blueprint $table) { $table->id(); $table->foreignId('property_id')->nullable()->constrained()->nullOnDelete(); $table->foreignId('society_id')->nullable()->constrained()->nullOnDelete(); $table->string('name'); $table->string('phone'); $table->string('email')->nullable(); $table->string('budget')->nullable(); $table->string('source')->default('Website'); $table->string('status')->default('New'); $table->string('assigned_to')->nullable(); $table->text('notes')->nullable(); $table->timestamps(); }); } public function down(): void { Schema::dropIfExists('leads'); } };
