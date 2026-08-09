<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Locality;
use App\Models\Region;
use App\Models\Society;
use App\Services\Ncr\LocalityResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Sector numbering restarts in every NCR city. A locality lookup keyed on the slug alone
 * hands the second city the first city's row, which is how eight Noida societies came to
 * sit on Gurugram's Sector 44 page.
 */
class LocalityCityScopingTest extends TestCase
{
    use RefreshDatabase;

    private function city(string $name, string $slug, string $state): City
    {
        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);

        return City::firstOrCreate(['slug' => $slug], [
            'region_id' => $region->id, 'name' => $name, 'state' => $state, 'is_active' => true,
        ]);
    }

    private function society(string $name, string $locality, City $city, ?Locality $link = null): Society
    {
        return Society::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.uniqid(),
            'locality' => $locality,
            'locality_id' => $link?->id,
            'city' => $city->name,
            'city_id' => $city->id,
            'state' => $city->state,
        ]);
    }

    public function test_the_same_sector_in_two_cities_is_two_localities(): void
    {
        $gurugram = $this->city('Gurugram', 'gurgaon', 'Haryana');
        $noida = $this->city('Noida', 'noida', 'Uttar Pradesh');
        $resolver = app(LocalityResolver::class);

        $a = $resolver->resolve('Sector 44', ['city_id' => $gurugram->id, 'city' => 'Gurugram', 'state' => 'Haryana']);
        $b = $resolver->resolve('Sector 44', ['city_id' => $noida->id, 'city' => 'Noida', 'state' => 'Uttar Pradesh']);

        $this->assertNotNull($a);
        $this->assertNotNull($b);
        $this->assertNotSame($a->id, $b->id, 'Gurugram and Noida must not share a Sector 44');
        $this->assertSame('Noida', $b->city);
        $this->assertSame($noida->id, $b->city_id);
    }

    public function test_the_same_sector_in_one_city_is_reused(): void
    {
        $gurugram = $this->city('Gurugram', 'gurgaon', 'Haryana');
        $resolver = app(LocalityResolver::class);

        $a = $resolver->resolve('Sector 44', ['city_id' => $gurugram->id, 'city' => 'Gurugram', 'state' => 'Haryana']);
        $b = $resolver->resolve('sec-44', ['city_id' => $gurugram->id, 'city' => 'Gurugram', 'state' => 'Haryana']);

        $this->assertSame($a->id, $b->id);
        $this->assertSame(1, Locality::where('slug', 'sector-44')->count());
    }

    /** The exact live state: Noida societies pointing at Gurugram's Sector 44. */
    public function test_the_repair_moves_misfiled_societies_to_their_own_city(): void
    {
        $gurugram = $this->city('Gurugram', 'gurgaon', 'Haryana');
        $noida = $this->city('Noida', 'noida', 'Uttar Pradesh');

        $gurugramSector44 = Locality::create([
            'name' => 'Sector 44', 'slug' => 'sector-44', 'city' => 'Gurugram',
            'city_id' => $gurugram->id, 'state' => 'Haryana', 'published_status' => 'published',
        ]);

        $stray = $this->society('Kartik Kunj Apartments', 'Sector 44', $noida, $gurugramSector44);
        $local = $this->society('DLF Belvedere', 'Sector 44', $gurugram, $gurugramSector44);

        $this->artisan('societies:repair-locality-cities')->assertSuccessful();
        $this->assertSame($gurugramSector44->id, $stray->fresh()->locality_id, 'the report must not write');

        $this->artisan('societies:repair-locality-cities', ['--apply' => true])->assertSuccessful();

        $moved = $stray->fresh();
        $this->assertNotSame($gurugramSector44->id, $moved->locality_id);

        $noidaSector44 = Locality::find($moved->locality_id);
        $this->assertSame('Noida', $noidaSector44->city);
        $this->assertSame($noida->id, $noidaSector44->city_id);

        $this->assertSame($gurugramSector44->id, $local->fresh()->locality_id, 'the Gurugram society must not move');
    }

    /** Gurgaon and Gurugram name one city; the repair must not shuffle rows between them. */
    public function test_gurgaon_and_gurugram_are_not_treated_as_different_cities(): void
    {
        $gurugram = $this->city('Gurugram', 'gurgaon', 'Haryana');

        $locality = Locality::create([
            'name' => 'Sector 44', 'slug' => 'sector-44', 'city' => 'Gurgaon',
            'city_id' => $gurugram->id, 'state' => 'Haryana', 'published_status' => 'published',
        ]);

        $society = $this->society('DLF Belvedere', 'Sector 44', $gurugram, $locality);

        $this->artisan('societies:repair-locality-cities', ['--apply' => true])->assertSuccessful();

        $this->assertSame($locality->id, $society->fresh()->locality_id);
    }

    /** The importer is the source of the bug, so it needs its own guard. */
    public function test_the_importer_does_not_hand_noida_a_gurugram_locality(): void
    {
        config(['services.admin_api_token' => 'admin-test-token']);

        $gurugram = $this->city('Gurugram', 'gurgaon', 'Haryana');
        $noida = $this->city('Noida', 'noida', 'Uttar Pradesh');

        $gurugramSector44 = Locality::create([
            'name' => 'Sector 44', 'slug' => 'sector-44', 'city' => 'Gurugram',
            'city_id' => $gurugram->id, 'state' => 'Haryana', 'published_status' => 'published',
        ]);

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies', [
                'name' => 'Express Green', 'locality' => 'Sector 44',
                'city' => 'Noida', 'state' => 'Uttar Pradesh', 'city_id' => $noida->id,
            ])
            ->assertSuccessful();

        $society = Society::findOrFail($response->json('data.id') ?? $response->json('id'));

        $this->assertNotSame($gurugramSector44->id, $society->locality_id);
        $this->assertSame('Noida', Locality::find($society->locality_id)->city);
    }
}
