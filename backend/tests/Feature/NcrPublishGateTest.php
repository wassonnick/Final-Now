<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\NcrCityLaunchApproval;
use App\Models\Region;
use App\Models\Society;
use App\Services\Ncr\NcrCityLaunchPolicy;
use App\Services\Society\Import\SocietyDraftCompletionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NcrPublishGateTest extends TestCase
{
    use RefreshDatabase;

    private function city(string $name, string $slug): City
    {
        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);

        // NCR cities ship pre-seeded by migration, so take the existing row when present.
        $city = City::firstOrCreate(
            ['slug' => $slug],
            ['region_id' => $region->id, 'name' => $name, 'state' => 'Delhi', 'is_active' => true],
        );
        $city->update(['is_active' => true]);

        return $city;
    }

    private function society(?City $city): Society
    {
        return Society::create([
            'name' => 'GH-14',
            'slug' => 'gh-14-'.uniqid(),
            'city_id' => $city?->id,
            'city' => $city?->name,
            'sector' => 'GH-14',
            'description' => 'A complete description that satisfies the completeness gate.',
            'score' => 7.5,
            'status' => 'Draft',
            'is_published' => false,
            'image_approved_by_admin' => true,
        ]);
    }

    /**
     * The failure this exists to prevent: a Delhi society live on a site whose own Delhi
     * page tells visitors the city is still launching.
     */
    public function test_a_society_in_an_unlaunched_city_is_not_publishable(): void
    {
        $delhi = $this->city('Delhi', 'delhi');
        $missing = app(SocietyDraftCompletionService::class)->missing($this->society($delhi));

        $this->assertContains('city_not_launched', $missing);
    }

    /**
     * The home city is live by definition. approvedSlugs() is empty whenever NCR indexing
     * is off, so gating on approval alone would have stopped the entire Gurgaon pipeline —
     * a far worse outcome than the bug being fixed.
     */
    public function test_the_home_city_is_never_gated(): void
    {
        config(['features.ncr_city_indexing' => false, 'features.ncr_indexable_city_slugs' => []]);

        $gurgaon = $this->city('Gurugram', 'gurgaon');
        $missing = app(SocietyDraftCompletionService::class)->missing($this->society($gurgaon));

        $this->assertNotContains('city_not_launched', $missing);
    }

    /** Legacy rows predate city linking; they are Gurgaon and must not be blocked. */
    public function test_a_society_with_no_city_link_is_not_gated(): void
    {
        $missing = app(SocietyDraftCompletionService::class)->missing($this->society(null));

        $this->assertNotContains('city_not_launched', $missing);
    }

    /** Approving the city opens it, which is the whole point of the approval record. */
    public function test_an_approved_city_becomes_publishable(): void
    {
        config([
            'features.ncr_city_indexing' => true,
            'features.ncr_multicity' => true,
        ]);

        $delhi = $this->city('Delhi', 'delhi');
        NcrCityLaunchApproval::create([
            'city_id' => $delhi->id,
            'city_slug' => 'delhi',
            'status' => 'approved',
            'approved_for_indexing' => true,
            'approved_for_sitemap' => true,
        ]);

        $this->assertTrue(app(NcrCityLaunchPolicy::class)->cityMayPublish($delhi));
        $this->assertNotContains('city_not_launched', app(SocietyDraftCompletionService::class)->missing($this->society($delhi)));
    }

    /**
     * Opening a city and indexing a city are separate decisions. Indexing needs five
     * published societies, and a city cannot reach five while publishing is what it is
     * waiting on — so opening must not require the indexing bar, or the first society in
     * any new city is unpublishable forever.
     */
    public function test_opening_a_city_for_publishing_does_not_require_the_indexing_bar(): void
    {
        config(['features.ncr_city_indexing' => false, 'features.ncr_indexable_city_slugs' => []]);

        $delhi = $this->city('Delhi', 'delhi');
        $society = $this->society($delhi);

        $this->assertContains('city_not_launched', app(SocietyDraftCompletionService::class)->missing($society));

        $this->artisan('ncr:open-city', ['slug' => 'delhi'])->assertSuccessful();

        $this->assertTrue(app(NcrCityLaunchPolicy::class)->cityMayPublish($delhi));
        $this->assertNotContains('city_not_launched', app(SocietyDraftCompletionService::class)->missing($society->fresh()));

        // Open for business is not the same as open to Google.
        $this->assertFalse(app(NcrCityLaunchPolicy::class)->cityIsApproved($delhi));
    }

    public function test_closing_a_city_stops_publishing_into_it_again(): void
    {
        $delhi = $this->city('Delhi', 'delhi');
        $this->artisan('ncr:open-city', ['slug' => 'delhi'])->assertSuccessful();
        $this->artisan('ncr:open-city', ['slug' => 'delhi', '--close' => true])->assertSuccessful();

        $this->assertFalse(app(NcrCityLaunchPolicy::class)->cityMayPublish($delhi));
    }

    /** A published society showing a placeholder is the quality problem, not a lesser good. */
    public function test_auto_publish_requires_an_approved_cover(): void
    {
        $gurgaon = $this->city('Gurugram', 'gurgaon');
        $society = $this->society($gurgaon);
        $society->update(['image_approved_by_admin' => false]);

        $this->assertContains('approved_image', app(SocietyDraftCompletionService::class)->missing($society->fresh()));

        // Deliberately escapable: with Google Places failing, an operator may need to
        // publish without covers rather than stall the pipeline entirely.
        config(['features.auto_publish_requires_image' => false]);
        $this->assertNotContains('approved_image', app(SocietyDraftCompletionService::class)->missing($society->fresh()));
    }

    /** Anything published before the gate existed still needs finding. */
    public function test_the_audit_command_reports_and_unpublishes_offenders(): void
    {
        $delhi = $this->city('Delhi', 'delhi');
        $society = $this->society($delhi);
        $society->update(['is_published' => true, 'status' => 'Verified']);

        $this->artisan('ncr:audit-published')->assertSuccessful();
        $this->assertTrue((bool) $society->fresh()->is_published, 'A report-only run must not change anything.');

        $this->artisan('ncr:audit-published', ['--unpublish' => true])->assertSuccessful();

        $society->refresh();
        $this->assertFalse((bool) $society->is_published);
        $this->assertSame('Draft', $society->status);
    }
}
