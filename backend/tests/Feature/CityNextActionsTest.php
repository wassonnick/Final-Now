<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Locality;
use App\Models\NcrCityLaunchApproval;
use App\Models\Region;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The readiness panel is the only place that says what a city still needs, so a stale
 * sentence there sends someone looking for a step that does not exist.
 */
class CityNextActionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.admin_api_token' => 'admin-test-token',
            'features.ncr_multicity' => true,
            'features.home_city_slugs' => ['gurgaon'],
        ]);
    }

    private function city(string $name, string $slug, string $state): City
    {
        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);

        return City::firstOrCreate(['slug' => $slug], [
            'region_id' => $region->id, 'name' => $name, 'state' => $state, 'is_active' => true,
        ]);
    }

    private function readyCity(): City
    {
        $city = $this->city('Delhi', 'delhi', 'Delhi');

        foreach (range(1, 5) as $i) {
            Society::create([
                'name' => "Delhi Society {$i}", 'slug' => "delhi-society-{$i}",
                'city' => 'Delhi', 'city_id' => $city->id, 'state' => 'Delhi',
                'status' => 'Verified', 'is_published' => true,
            ]);
        }

        foreach (['Paschim Vihar', 'Rohini', 'Janakpuri'] as $name) {
            Locality::firstOrCreate(['slug' => Str::slug($name)], [
                'name' => $name, 'city' => 'Delhi', 'city_id' => $city->id,
                'state' => 'Delhi', 'published_status' => 'published',
            ]);
        }

        return $city;
    }

    private function actionsFor(string $slug): array
    {
        $rows = $this->withToken('admin-test-token')
            ->getJson('/api/admin/locations/audit')
            ->assertSuccessful()
            ->json('data.city_readiness');

        return collect($rows)->firstWhere('slug', $slug)['next_actions'] ?? [];
    }

    /** The bug: a fully approved city was told not to index until final approval. */
    public function test_an_approved_city_is_not_told_to_hold_off_indexing(): void
    {
        config(['features.ncr_city_indexing' => true]);
        $delhi = $this->readyCity();

        NcrCityLaunchApproval::create([
            'city_slug' => 'delhi', 'city_id' => $delhi->id, 'status' => 'approved',
            'approved_for_indexing' => true, 'approved_for_sitemap' => true, 'approved_at' => now(),
        ]);

        $actions = $this->actionsFor('delhi');

        $this->assertCount(1, $actions);
        $this->assertStringContainsString('Launched', $actions[0]);
        $this->assertStringNotContainsString('do not index', implode(' ', $actions));
        $this->assertStringNotContainsString('manual city launch review', implode(' ', $actions));
    }

    public function test_a_ready_but_unapproved_city_says_it_is_being_held(): void
    {
        config(['features.ncr_city_indexing' => true]);
        $this->readyCity();

        $actions = $this->actionsFor('delhi');

        $this->assertStringContainsString('Held out of the sitemap', implode(' ', $actions));
    }

    /** One switch gating every city should be named once, not disguised as six problems. */
    public function test_the_global_flag_is_named_when_it_is_off(): void
    {
        config(['features.ncr_city_indexing' => false]);
        $this->readyCity();

        $this->assertStringContainsString('NCR_CITY_INDEXING_ENABLED is off', implode(' ', $this->actionsFor('delhi')));
    }

    /** Real blockers must still be reported ahead of the approval line. */
    public function test_content_blockers_are_still_listed(): void
    {
        config(['features.ncr_city_indexing' => true]);
        $this->city('Faridabad', 'faridabad', 'Haryana');

        $actions = implode(' ', $this->actionsFor('faridabad'));

        $this->assertStringContainsString('five verified society profiles', $actions);
        $this->assertStringContainsString('localities', $actions);
    }
}
