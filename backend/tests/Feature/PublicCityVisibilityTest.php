<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\NcrCityLaunchApproval;
use App\Models\Region;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Publishing was gated; reading never was. A society published into Delhi before Delhi
 * launched stayed in the public catalogue, so a search headed "Gurgaon" returned Paschim
 * Vihar flats.
 */
class PublicCityVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['features.home_city_slugs' => ['gurgaon'], 'features.ncr_city_indexing' => true]);
    }

    private function city(string $name, string $slug, string $state): City
    {
        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);

        return City::firstOrCreate(['slug' => $slug], [
            'region_id' => $region->id, 'name' => $name, 'state' => $state, 'is_active' => true,
        ]);
    }

    private function society(string $name, ?City $city, ?string $cityText = null): Society
    {
        return Society::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'city' => $cityText ?? $city?->name,
            'city_id' => $city?->id,
            'state' => $city?->state,
            'status' => 'Verified',
            'is_published' => true,
        ]);
    }

    private function names(): array
    {
        return collect($this->getJson('/api/societies?per_page=50')->assertSuccessful()->json('data.data'))
            ->pluck('name')->all();
    }

    public function test_a_society_in_an_unlaunched_city_is_not_in_the_public_listing(): void
    {
        $gurugram = $this->city('Gurugram', 'gurgaon', 'Haryana');
        $delhi = $this->city('Delhi', 'delhi', 'Delhi');

        $this->society('DLF Belvedere', $gurugram);
        $this->society('A2B MIG Flats', $delhi);

        $this->assertSame(['DLF Belvedere'], $this->names());
    }

    /** Legacy rows carry a city string and no city_id; they are Gurgaon and must stay. */
    public function test_a_society_with_no_city_link_stays_visible(): void
    {
        $this->city('Gurugram', 'gurgaon', 'Haryana');
        $this->society('Legacy Towers', null, 'Gurgaon');

        $this->assertSame(['Legacy Towers'], $this->names());
    }

    /** A Delhi row that never got a city_id must still be hidden, matched on the name. */
    public function test_an_unmapped_society_in_an_unlaunched_city_is_still_hidden(): void
    {
        $this->city('Gurugram', 'gurgaon', 'Haryana');
        $this->city('Delhi', 'delhi', 'Delhi');

        $this->society('Paschim Vihar Flats', null, 'Delhi');

        $this->assertSame([], $this->names());
    }

    public function test_search_suggestions_do_not_offer_unlaunched_inventory(): void
    {
        $delhi = $this->city('Delhi', 'delhi', 'Delhi');
        $this->society('A4 DDA Janta Flats', $delhi);

        // No search term: `ilike` is Postgres-only and the suite runs on sqlite, so the
        // term-matching branch cannot be exercised here. The city gate is what this pins.
        $data = $this->getJson('/api/societies/lookup')->assertSuccessful()->json('data');
        $this->assertSame([], $data);
    }

    public function test_the_detail_page_is_not_reachable_by_slug_either(): void
    {
        $delhi = $this->city('Delhi', 'delhi', 'Delhi');
        $this->society('A2B MIG Flats', $delhi);

        $this->getJson('/api/societies/a2b-mig-flats')->assertNotFound();
    }

    /** The point of the gate: approving the city puts its inventory on the site. */
    public function test_approving_the_city_makes_its_societies_public(): void
    {
        $delhi = $this->city('Delhi', 'delhi', 'Delhi');
        $this->society('A2B MIG Flats', $delhi);

        $this->assertSame([], $this->names());

        NcrCityLaunchApproval::create([
            'city_slug' => 'delhi', 'city_id' => $delhi->id, 'status' => 'approved',
            'approved_for_indexing' => true, 'approved_for_sitemap' => true, 'approved_at' => now(),
        ]);

        $this->assertSame(['A2B MIG Flats'], $this->names());
        $this->getJson('/api/societies/a2b-mig-flats')->assertSuccessful();
    }
}
