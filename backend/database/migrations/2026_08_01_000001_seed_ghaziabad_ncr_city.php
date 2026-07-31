<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The front end lists six NCR cities and the cities table held five — Ghaziabad was
 * advertised as a market with nowhere to attach a society, so anything imported there
 * would arrive with a null city_id and drop out of the city filter.
 */
return new class extends Migration
{
    public function up(): void
    {
        $regionId = DB::table('regions')->where('slug', 'delhi-ncr')->value('id')
            ?? DB::table('regions')->value('id');

        if (! $regionId || DB::table('cities')->where('slug', 'ghaziabad')->exists()) {
            return;
        }

        DB::table('cities')->insert([
            'region_id' => $regionId,
            'name' => 'Ghaziabad',
            'slug' => 'ghaziabad',
            'state' => 'Uttar Pradesh',
            'city_type' => 'expansion_market',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('cities')->where('slug', 'ghaziabad')->whereNotExists(
            fn ($q) => $q->select(DB::raw(1))->from('societies')->whereColumn('societies.city_id', 'cities.id')
        )->delete();
    }
};
