<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intelligence_corrections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('society_id')->nullable()->constrained()->nullOnDelete();
            $table->string('society_name')->nullable();
            $table->string('information_key')->nullable();
            $table->text('information_challenged');
            $table->text('suggested_correction');
            $table->text('supporting_url')->nullable();
            $table->string('supporting_attachment')->nullable();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('relationship_to_society')->nullable();
            $table->boolean('consent')->default(false);
            $table->string('status')->default('submitted')->index();
            $table->text('admin_resolution_note')->nullable();
            $table->string('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intelligence_corrections');
    }
};
