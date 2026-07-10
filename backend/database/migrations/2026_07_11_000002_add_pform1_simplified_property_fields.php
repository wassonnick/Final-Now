<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (! Schema::hasColumn('properties', 'property_type')) {
                $table->string('property_type')->nullable()->after('listing_type');
            }
            if (! Schema::hasColumn('properties', 'sector')) {
                $table->string('sector')->nullable()->after('locality');
            }
            if (! Schema::hasColumn('properties', 'city')) {
                $table->string('city')->nullable()->after('sector');
            }
            if (! Schema::hasColumn('properties', 'tower')) {
                $table->string('tower')->nullable()->after('city');
            }
            if (! Schema::hasColumn('properties', 'unit_number')) {
                $table->string('unit_number')->nullable()->after('tower');
            }
            if (! Schema::hasColumn('properties', 'balconies')) {
                $table->string('balconies')->nullable()->after('bathrooms');
            }
            if (! Schema::hasColumn('properties', 'carpet_area_sqft')) {
                $table->string('carpet_area_sqft')->nullable()->after('area_sqft');
            }
            if (! Schema::hasColumn('properties', 'available_from')) {
                $table->date('available_from')->nullable()->after('furnished_status');
            }
            if (! Schema::hasColumn('properties', 'rent_amount')) {
                $table->unsignedBigInteger('rent_amount')->nullable()->after('price');
            }
            if (! Schema::hasColumn('properties', 'rent_unit')) {
                $table->string('rent_unit')->default('monthly')->after('rent_amount');
            }
            if (! Schema::hasColumn('properties', 'sale_price')) {
                $table->unsignedBigInteger('sale_price')->nullable()->after('rent_unit');
            }
            if (! Schema::hasColumn('properties', 'sale_price_unit')) {
                $table->string('sale_price_unit')->default('total')->after('sale_price');
            }
            if (! Schema::hasColumn('properties', 'maintenance_included')) {
                $table->boolean('maintenance_included')->default(false)->after('maintenance');
            }
            if (! Schema::hasColumn('properties', 'maintenance_amount')) {
                $table->unsignedBigInteger('maintenance_amount')->nullable()->after('maintenance_included');
            }
            if (! Schema::hasColumn('properties', 'maintenance_unit')) {
                $table->string('maintenance_unit')->default('monthly')->after('maintenance_amount');
            }
            if (! Schema::hasColumn('properties', 'price_per_sqft')) {
                $table->unsignedBigInteger('price_per_sqft')->nullable()->after('sale_price_unit');
            }
            if (! Schema::hasColumn('properties', 'inherited_society_amenities')) {
                $table->json('inherited_society_amenities')->nullable()->after('amenities');
            }
            if (! Schema::hasColumn('properties', 'property_amenities')) {
                $table->json('property_amenities')->nullable()->after('inherited_society_amenities');
            }
        });

        Schema::table('owner_listings', function (Blueprint $table) {
            if (! Schema::hasColumn('owner_listings', 'locality')) {
                $table->string('locality')->nullable()->after('society_name');
            }
            if (! Schema::hasColumn('owner_listings', 'sector')) {
                $table->string('sector')->nullable()->after('locality');
            }
            if (! Schema::hasColumn('owner_listings', 'city')) {
                $table->string('city')->nullable()->after('sector');
            }
            if (! Schema::hasColumn('owner_listings', 'rent_amount')) {
                $table->unsignedBigInteger('rent_amount')->nullable()->after('expected_price');
            }
            if (! Schema::hasColumn('owner_listings', 'sale_price')) {
                $table->unsignedBigInteger('sale_price')->nullable()->after('rent_amount');
            }
            if (! Schema::hasColumn('owner_listings', 'property_amenities')) {
                $table->json('property_amenities')->nullable()->after('details');
            }
            if (! Schema::hasColumn('owner_listings', 'inherited_society_amenities')) {
                $table->json('inherited_society_amenities')->nullable()->after('property_amenities');
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            foreach ([
                'property_type', 'sector', 'city', 'tower', 'unit_number', 'balconies',
                'carpet_area_sqft', 'available_from', 'rent_amount', 'rent_unit', 'sale_price',
                'sale_price_unit', 'maintenance_included', 'maintenance_amount', 'maintenance_unit',
                'price_per_sqft', 'inherited_society_amenities', 'property_amenities',
            ] as $column) {
                if (Schema::hasColumn('properties', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('owner_listings', function (Blueprint $table) {
            foreach ([
                'locality', 'sector', 'city', 'rent_amount', 'sale_price',
                'property_amenities', 'inherited_society_amenities',
            ] as $column) {
                if (Schema::hasColumn('owner_listings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
