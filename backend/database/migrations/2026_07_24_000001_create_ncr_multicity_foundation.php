<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->createLocationTables();
        $this->extendExistingTables();
        $this->seedNcrFoundation();
        $this->backfillKnownCityLinks();
    }

    public function down(): void
    {
        $this->dropIfPresent('leads', [
            'region_id', 'city_id', 'zone_id', 'locality_id',
            'target_city', 'target_locality', 'target_zone', 'property_intent', 'ncr_context',
        ]);

        $this->dropIfPresent('properties', [
            'region_id', 'city_id', 'zone_id', 'locality_id',
            'property_category', 'transaction_type',
        ]);

        $this->dropIfPresent('societies', [
            'region_id', 'city_id', 'zone_id', 'locality_id',
            'micro_market', 'authority', 'pincode',
        ]);

        $this->dropIfPresent('society_import_jobs', [
            'target_region_id', 'target_city_id', 'target_zone_id', 'target_locality_id', 'target_city',
        ]);

        $this->dropIfPresent('verified_society_import_jobs', [
            'target_region_id', 'target_city_id', 'target_zone_id', 'target_locality_id', 'target_city',
        ]);

        Schema::dropIfExists('zones');
        Schema::dropIfExists('cities');
        Schema::dropIfExists('regions');
        // localities may pre-date NCR-1 in this project, so the rollback does not drop it.
    }

    private function createLocationTables(): void
    {
        if (! Schema::hasTable('regions')) {
            Schema::create('regions', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->string('country')->default('India');
                $table->string('state_group')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('cities')) {
            Schema::create('cities', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('region_id')->nullable()->index();
                $table->string('name');
                $table->string('slug')->unique();
                $table->string('state')->nullable()->index();
                $table->string('city_type')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('zones')) {
            Schema::create('zones', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('region_id')->nullable()->index();
                $table->unsignedBigInteger('city_id')->nullable()->index();
                $table->string('name');
                $table->string('slug')->index();
                $table->string('zone_type')->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
                $table->unique(['city_id', 'slug']);
            });
        }

        if (! Schema::hasTable('localities')) {
            Schema::create('localities', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->unsignedBigInteger('region_id')->nullable()->index();
                $table->unsignedBigInteger('city_id')->nullable()->index();
                $table->unsignedBigInteger('zone_id')->nullable()->index();
                $table->string('name');
                $table->string('slug')->index();
                $table->string('city')->nullable()->index();
                $table->string('state')->nullable()->index();
                $table->string('pincode')->nullable();
                $table->decimal('latitude', 11, 8)->nullable();
                $table->decimal('longitude', 11, 8)->nullable();
                $table->string('locality_type')->nullable();
                $table->string('sector_code')->nullable();
                $table->text('description')->nullable();
                $table->decimal('connectivity_score', 5, 2)->nullable();
                $table->decimal('safety_score', 5, 2)->nullable();
                $table->decimal('lifestyle_score', 5, 2)->nullable();
                $table->decimal('avg_rent_1bhk', 12, 2)->nullable();
                $table->decimal('avg_rent_2bhk', 12, 2)->nullable();
                $table->decimal('avg_rent_3bhk', 12, 2)->nullable();
                $table->decimal('avg_rent_4bhk', 12, 2)->nullable();
                $table->decimal('price_per_sqft', 12, 2)->nullable();
                $table->decimal('metro_distance_km', 8, 2)->nullable();
                $table->decimal('airport_distance_km', 8, 2)->nullable();
                $table->decimal('cyber_city_distance_km', 8, 2)->nullable();
                $table->string('published_status')->default('draft')->index();
                $table->string('seo_title')->nullable();
                $table->text('seo_description')->nullable();
                $table->timestamps();
            });
        } else {
            $this->addColumns('localities', [
                'region_id' => fn (Blueprint $table) => $table->unsignedBigInteger('region_id')->nullable()->index(),
                'city_id' => fn (Blueprint $table) => $table->unsignedBigInteger('city_id')->nullable()->index(),
                'zone_id' => fn (Blueprint $table) => $table->unsignedBigInteger('zone_id')->nullable()->index(),
                'locality_type' => fn (Blueprint $table) => $table->string('locality_type')->nullable(),
                'sector_code' => fn (Blueprint $table) => $table->string('sector_code')->nullable(),
                'published_status' => fn (Blueprint $table) => $table->string('published_status')->default('draft')->index(),
                'seo_title' => fn (Blueprint $table) => $table->string('seo_title')->nullable(),
                'seo_description' => fn (Blueprint $table) => $table->text('seo_description')->nullable(),
            ]);
        }
    }

    private function extendExistingTables(): void
    {
        $this->addColumns('societies', [
            'region_id' => fn (Blueprint $table) => $table->unsignedBigInteger('region_id')->nullable()->index(),
            'city_id' => fn (Blueprint $table) => $table->unsignedBigInteger('city_id')->nullable()->index(),
            'zone_id' => fn (Blueprint $table) => $table->unsignedBigInteger('zone_id')->nullable()->index(),
            'locality_id' => fn (Blueprint $table) => $table->uuid('locality_id')->nullable()->index(),
            'micro_market' => fn (Blueprint $table) => $table->string('micro_market')->nullable(),
            'authority' => fn (Blueprint $table) => $table->string('authority')->nullable(),
            'pincode' => fn (Blueprint $table) => $table->string('pincode')->nullable(),
        ]);

        $this->addColumns('properties', [
            'region_id' => fn (Blueprint $table) => $table->unsignedBigInteger('region_id')->nullable()->index(),
            'city_id' => fn (Blueprint $table) => $table->unsignedBigInteger('city_id')->nullable()->index(),
            'zone_id' => fn (Blueprint $table) => $table->unsignedBigInteger('zone_id')->nullable()->index(),
            'locality_id' => fn (Blueprint $table) => $table->uuid('locality_id')->nullable()->index(),
            'property_category' => fn (Blueprint $table) => $table->string('property_category')->nullable(),
            'transaction_type' => fn (Blueprint $table) => $table->string('transaction_type')->nullable(),
        ]);

        $this->addColumns('leads', [
            'region_id' => fn (Blueprint $table) => $table->unsignedBigInteger('region_id')->nullable()->index(),
            'city_id' => fn (Blueprint $table) => $table->unsignedBigInteger('city_id')->nullable()->index(),
            'zone_id' => fn (Blueprint $table) => $table->unsignedBigInteger('zone_id')->nullable()->index(),
            'locality_id' => fn (Blueprint $table) => $table->uuid('locality_id')->nullable()->index(),
            'target_city' => fn (Blueprint $table) => $table->string('target_city')->nullable()->index(),
            'target_locality' => fn (Blueprint $table) => $table->string('target_locality')->nullable(),
            'target_zone' => fn (Blueprint $table) => $table->string('target_zone')->nullable(),
            'property_intent' => fn (Blueprint $table) => $table->string('property_intent')->nullable()->index(),
            'ncr_context' => fn (Blueprint $table) => $table->json('ncr_context')->nullable(),
        ]);

        foreach (['society_import_jobs', 'verified_society_import_jobs'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            $this->addColumns($tableName, [
                'target_region_id' => fn (Blueprint $table) => $table->unsignedBigInteger('target_region_id')->nullable()->index(),
                'target_city_id' => fn (Blueprint $table) => $table->unsignedBigInteger('target_city_id')->nullable()->index(),
                'target_zone_id' => fn (Blueprint $table) => $table->unsignedBigInteger('target_zone_id')->nullable()->index(),
                'target_locality_id' => fn (Blueprint $table) => $table->uuid('target_locality_id')->nullable()->index(),
                'target_city' => fn (Blueprint $table) => $table->string('target_city')->nullable()->index(),
            ]);
        }
    }

    private function seedNcrFoundation(): void
    {
        DB::table('regions')->updateOrInsert(
            ['slug' => 'delhi-ncr'],
            [
                'name' => 'Delhi NCR',
                'country' => 'India',
                'state_group' => 'Delhi, Haryana, Uttar Pradesh',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $regionId = DB::table('regions')->where('slug', 'delhi-ncr')->value('id');

        foreach ($this->citySeeds($regionId) as $city) {
            DB::table('cities')->updateOrInsert(
                ['slug' => $city['slug']],
                $city + ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    private function backfillKnownCityLinks(): void
    {
        $regionId = DB::table('regions')->where('slug', 'delhi-ncr')->value('id');
        if (! $regionId) {
            return;
        }

        foreach ($this->citySeeds($regionId) as $seed) {
            $cityId = DB::table('cities')->where('slug', $seed['slug'])->value('id');
            if (! $cityId) {
                continue;
            }

            $names = $seed['slug'] === 'gurgaon' ? ['Gurgaon', 'Gurugram'] : [$seed['name']];

            foreach (['societies', 'properties'] as $table) {
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'city') || ! Schema::hasColumn($table, 'city_id')) {
                    continue;
                }

                DB::table($table)
                    ->whereNull('city_id')
                    ->whereIn('city', $names)
                    ->update(['region_id' => $regionId, 'city_id' => $cityId]);
            }
        }
    }

    private function citySeeds(int|string|null $regionId): array
    {
        return [
            ['region_id' => $regionId, 'name' => 'Gurugram', 'slug' => 'gurgaon', 'state' => 'Haryana', 'city_type' => 'core_market', 'is_active' => true],
            ['region_id' => $regionId, 'name' => 'Delhi', 'slug' => 'delhi', 'state' => 'Delhi', 'city_type' => 'expansion_market', 'is_active' => true],
            ['region_id' => $regionId, 'name' => 'Noida', 'slug' => 'noida', 'state' => 'Uttar Pradesh', 'city_type' => 'expansion_market', 'is_active' => true],
            ['region_id' => $regionId, 'name' => 'Greater Noida', 'slug' => 'greater-noida', 'state' => 'Uttar Pradesh', 'city_type' => 'expansion_market', 'is_active' => true],
            ['region_id' => $regionId, 'name' => 'Faridabad', 'slug' => 'faridabad', 'state' => 'Haryana', 'city_type' => 'expansion_market', 'is_active' => true],
        ];
    }

    private function addColumns(string $tableName, array $columns): void
    {
        if (! Schema::hasTable($tableName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($tableName, $columns) {
            foreach ($columns as $column => $definition) {
                if (! Schema::hasColumn($tableName, $column)) {
                    $definition($table);
                }
            }
        });
    }

    private function dropIfPresent(string $tableName, array $columns): void
    {
        if (! Schema::hasTable($tableName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($tableName, $columns) {
            foreach ($columns as $column) {
                if (Schema::hasColumn($tableName, $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
