<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (! Schema::hasColumn('properties', 'source_type')) {
                $table->string('source_type')->nullable()->default('societyflats_inventory')->index()->after('source_lead_id');
            }

            if (! Schema::hasColumn('properties', 'inventory_owner_type')) {
                $table->string('inventory_owner_type')->nullable()->default('societyflats')->index()->after('source_type');
            }

            if (! Schema::hasColumn('properties', 'owner_account_id')) {
                $table->foreignId('owner_account_id')->nullable()->after('inventory_owner_type')->constrained('accounts')->nullOnDelete();
            }

            if (! Schema::hasColumn('properties', 'broker_account_id')) {
                $table->foreignId('broker_account_id')->nullable()->after('owner_account_id')->constrained('accounts')->nullOnDelete();
            }

            if (! Schema::hasColumn('properties', 'owner_listing_id')) {
                $table->foreignId('owner_listing_id')->nullable()->after('broker_account_id')->constrained('owner_listings')->nullOnDelete();
            }

            if (! Schema::hasColumn('properties', 'submitted_by_user_id')) {
                $table->foreignId('submitted_by_user_id')->nullable()->after('owner_listing_id')->constrained('accounts')->nullOnDelete();
            }
        });

        DB::table('properties')
            ->whereNotNull('source_lead_id')
            ->where(function ($query) {
                $query->whereNull('source_type')->orWhere('source_type', 'societyflats_inventory');
            })
            ->update([
                'source_type' => 'lead_converted',
                'inventory_owner_type' => 'lead',
            ]);

        DB::table('properties')
            ->whereNull('source_type')
            ->update([
                'source_type' => 'societyflats_inventory',
                'inventory_owner_type' => 'societyflats',
            ]);
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            foreach ([
                'submitted_by_user_id',
                'owner_listing_id',
                'broker_account_id',
                'owner_account_id',
                'inventory_owner_type',
                'source_type',
            ] as $column) {
                if (Schema::hasColumn('properties', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
