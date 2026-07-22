<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account_devices', function (Blueprint $table) {
            $table->boolean('quiet_hours_enabled')->default(false)->after('owner_listing_updates');
            $table->string('quiet_hours_start', 5)->nullable()->after('quiet_hours_enabled');
            $table->string('quiet_hours_end', 5)->nullable()->after('quiet_hours_start');
            $table->string('timezone', 80)->nullable()->after('quiet_hours_end');
        });

        Schema::create('account_device_push_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_device_id')->nullable()->constrained('account_devices')->nullOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->string('event', 80)->index();
            $table->string('expo_ticket_id', 120)->nullable()->index();
            $table->string('status', 40)->default('queued')->index();
            $table->string('error_code', 120)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('receipt_checked_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_device_push_receipts');

        Schema::table('account_devices', function (Blueprint $table) {
            $table->dropColumn([
                'quiet_hours_enabled',
                'quiet_hours_start',
                'quiet_hours_end',
                'timezone',
            ]);
        });
    }
};
