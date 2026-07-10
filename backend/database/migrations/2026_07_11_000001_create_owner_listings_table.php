<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * First-class owner/broker listing submissions (flats + builder floors) with images.
 * Previously the Sell page only produced a free-text lead — no structured record, no
 * photos, nothing for the owner to track. This is the core inventory intake.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owner_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->nullable()->index();
            $table->string('name');
            $table->string('phone', 20)->index();
            $table->string('purpose', 10)->default('rent');           // rent | sale
            $table->string('listing_type', 20)->default('apartment'); // apartment | builder_floor
            $table->foreignId('society_id')->nullable()->index();
            $table->string('society_name')->nullable();
            $table->string('tower')->nullable();
            $table->string('bhk', 20)->nullable();
            $table->string('size_sqft', 40)->nullable();
            $table->string('floor', 40)->nullable();
            $table->string('furnishing', 60)->nullable();
            $table->string('availability', 120)->nullable();
            $table->string('expected_price', 60)->nullable();
            $table->text('details')->nullable();
            $table->json('images')->nullable();
            $table->string('status', 20)->default('submitted')->index(); // submitted | under_review | approved | rejected | converted
            $table->text('admin_notes')->nullable();
            $table->foreignId('property_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('owner_listings');
    }
};
