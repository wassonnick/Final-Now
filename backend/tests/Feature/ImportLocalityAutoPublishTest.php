<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Locality;
use App\Models\Region;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportLocalityAutoPublishTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    private function delhi(): City
    {
        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);

        return City::firstOrCreate(['slug' => 'delhi'], [
            'region_id' => $region->id, 'name' => 'Delhi', 'state' => 'Delhi', 'is_active' => true,
        ]);
    }

    /**
     * Launch readiness counts PUBLISHED localities. Created ones were left unpublished,
     * so a new city could never reach the depth its own gate demanded — the approval step
     * carried no decision, only delay.
     */
    public function test_an_imported_locality_is_published_immediately(): void
    {
        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies', [
                'name' => 'GH-14 Test', 'sector' => 'GH-14', 'locality' => 'Paschim Vihar',
                'city' => 'Delhi', 'state' => 'Delhi', 'city_id' => $this->delhi()->id,
            ])
            ->assertSuccessful();

        $locality = Locality::where('slug', 'paschim-vihar')->firstOrFail();
        $this->assertSame('published', $locality->published_status);
    }

    /**
     * The city was hardcoded to Gurgaon, so a Delhi import created a Gurgaon locality —
     * quietly undoing city segregation everywhere that reads locality.city.
     */
    public function test_the_locality_inherits_the_society_city(): void
    {
        $delhi = $this->delhi();

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies', [
                'name' => 'GH-15 Test', 'sector' => 'GH-15', 'locality' => 'Rohini',
                'city' => 'Delhi', 'state' => 'Delhi', 'city_id' => $delhi->id,
            ])
            ->assertSuccessful();

        $locality = Locality::where('slug', 'rohini')->firstOrFail();
        $this->assertSame('Delhi', $locality->city);
        $this->assertSame($delhi->id, $locality->city_id);
    }

    /**
     * The first backfill turned every value the importer had ever written into a published
     * page, ad copy included. The society keeps the text; it just must not become a page.
     */
    public function test_a_marketing_phrase_never_becomes_a_locality(): void
    {
        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies', [
                'name' => 'GH-17 Test', 'sector' => 'GH-17', 'locality' => 'Premium Gurgaon Corridor',
                'city' => 'Gurugram', 'state' => 'Haryana',
            ])
            ->assertSuccessful();

        $this->assertSame(0, Locality::where('slug', 'premium-gurgaon-corridor')->count());
    }

    /** "sec-36" must find Sector 36 rather than founding a rival page for the same place. */
    public function test_a_spelling_variant_reuses_the_existing_locality(): void
    {
        $existing = Locality::create([
            'name' => 'Sector 36', 'slug' => 'sector-36', 'city' => 'Gurugram',
            'state' => 'Haryana', 'published_status' => 'published',
        ]);

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies', [
                'name' => 'GH-18 Test', 'sector' => 'GH-18', 'locality' => 'sec-36',
                'city' => 'Gurugram', 'state' => 'Haryana',
            ])
            ->assertSuccessful();

        $this->assertSame(1, Locality::where('slug', 'sector-36')->count());
        $this->assertSame($existing->id, Society::findOrFail($response->json('data.id') ?? $response->json('id'))->locality_id);
    }

    /** A Delhi locality arriving without a city took the Gurgaon default and was born wrong. */
    public function test_a_known_delhi_locality_is_not_filed_under_gurgaon(): void
    {
        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies', [
                'name' => 'GH-19 Test', 'sector' => 'GH-19', 'locality' => 'Tagore Garden Extension',
            ])
            ->assertSuccessful();

        $this->assertSame('Delhi', Locality::where('slug', 'tagore-garden-extension')->firstOrFail()->city);
    }

    public function test_auto_publish_can_be_turned_off(): void
    {
        config(['features.locality_auto_publish' => false]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies', [
                'name' => 'GH-16 Test', 'sector' => 'GH-16', 'locality' => 'Janakpuri',
                'city' => 'Delhi', 'state' => 'Delhi', 'city_id' => $this->delhi()->id,
            ])
            ->assertSuccessful();

        $this->assertSame('draft', Locality::where('slug', 'janakpuri')->firstOrFail()->published_status);
    }
}
