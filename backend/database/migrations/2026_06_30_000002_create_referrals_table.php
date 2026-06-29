<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->string('referral_code', 24)->nullable()->unique()->after('api_token_created_at');
        });

        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referrer_account_id')->constrained('accounts')->cascadeOnDelete();
            $table->string('referred_name');
            $table->string('referred_phone', 20);
            $table->string('intent', 40)->default('rent');
            $table->string('status', 40)->default('submitted')->index();
            $table->string('reward_status', 40)->default('pending')->index();
            $table->text('notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamp('qualified_at')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->timestamp('rewarded_at')->nullable();
            $table->timestamps();
            $table->unique(['referrer_account_id', 'referred_phone']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referrals');
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropUnique(['referral_code']);
            $table->dropColumn('referral_code');
        });
    }
};
