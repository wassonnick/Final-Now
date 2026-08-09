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
 * The public market map used to be a hardcoded array, so approving a city in admin changed
 * nothing a visitor could see. These pin the derivation that replaced it.
 */
class NcrPublicCityStatusTest extends TestCase
{
    use RefreshDatabase;

    private function city(string $name, string $slug, string $state): City
    {
        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);

        return City::firstOrCreate(['slug' => $slug], [
            'region_id' => $region->id, 'name' => $name, 'state' => $state, 'is_active' => true,
        ]);
    }

    private function society(City $city, bool $published): Society
    {
        return Society::create([
            'name' => 'S'.uniqid(),
            'slug' => Str::slug('s'.uniqid()),
            'city' => $city->name,
            'city_id' => $city->id,
            'state' => $city->state,
            'status' => $published ? 'Verified' : 'Draft',
            'is_published' => $published,
        ]);
    }

    private function statuses(): array
    {
        return collect($this->getJson('/api/ncr/cities')->assertSuccessful()->json('data'))
            ->pluck('status', 'slug')
            ->all();
    }

    public function test_the_home_city_with_inventory_is_live(): void
    {
        config(['features.home_city_slugs' => ['gurgaon']]);
        $this->society($this->city('Gurugram', 'gurgaon', 'Haryana'), true);

        $this->assertSame('live', $this->statuses()['gurgaon']);
    }

    /** Published inventory is not the same as being open to search. */
    public function test_an_unapproved_city_with_inventory_is_launching(): void
    {
        config(['features.home_city_slugs' => ['gurgaon']]);
        $delhi = $this->city('Delhi', 'delhi', 'Delhi');
        $this->society($delhi, true);

        $this->assertSame('launching', $this->statuses()['delhi']);
    }

    public function test_a_city_with_nothing_in_it_is_planned(): void
    {
        $this->city('Faridabad', 'faridabad', 'Haryana');

        $this->assertSame('planned', $this->statuses()['faridabad']);
    }

    /** Drafts count as launching: work is underway, it is just not visible yet. */
    public function test_draft_only_inventory_still_reads_as_launching(): void
    {
        $noida = $this->city('Noida', 'noida', 'Uttar Pradesh');
        $this->society($noida, false);

        $this->assertSame('launching', $this->statuses()['noida']);
    }

    /** The point of the whole change: approving a city changes what the public site says. */
    public function test_approving_a_city_for_indexing_turns_it_live(): void
    {
        config(['features.ncr_city_indexing' => true, 'features.home_city_slugs' => ['gurgaon']]);

        $noida = $this->city('Noida', 'noida', 'Uttar Pradesh');
        $this->society($noida, true);

        $this->assertSame('launching', $this->statuses()['noida']);

        NcrCityLaunchApproval::create([
            'city_slug' => 'noida', 'city_id' => $noida->id, 'status' => 'approved',
            'approved_for_indexing' => true, 'approved_for_sitemap' => true, 'approved_at' => now(),
        ]);

        $this->assertSame('live', $this->statuses()['noida']);
    }
}
