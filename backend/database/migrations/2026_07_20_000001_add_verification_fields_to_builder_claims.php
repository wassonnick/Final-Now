<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Verification substance for admin-approved builder/RWA accounts: a claim must carry
// checkable identifiers (RERA/CIN or RWA registration no.), official contact points and
// an authorization proof link — not just a free-text note.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('builder_claims', function (Blueprint $table) {
            $table->string('registration_number', 120)->nullable(); // RERA/CIN (builder) or RWA registration no.
            $table->string('official_website', 500)->nullable();
            $table->string('official_email')->nullable();
            $table->string('authorization_proof_url', 1000)->nullable(); // letter/board-resolution link
            $table->string('gst_number', 30)->nullable(); // builders only
        });
    }

    public function down(): void
    {
        Schema::table('builder_claims', function (Blueprint $table) {
            $table->dropColumn(['registration_number', 'official_website', 'official_email', 'authorization_proof_url', 'gst_number']);
        });
    }
};
