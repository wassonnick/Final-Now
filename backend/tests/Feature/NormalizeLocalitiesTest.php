<?php

namespace Tests\Feature;

use App\Models\Locality;
use App\Models\Society;
use App\Services\Ncr\LocalityNameService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class NormalizeLocalitiesTest extends TestCase
{
    use RefreshDatabase;

    private function locality(string $name, string $city = 'Gurugram', array $extra = []): Locality
    {
        return Locality::create(array_merge([
            'name' => $name,
            'slug' => Str::slug($name),
            'city' => $city,
            'state' => $city === 'Delhi' ? 'Delhi' : 'Haryana',
            'published_status' => 'published',
        ], $extra));
    }

    private function society(string $name, string $localityName, ?Locality $locality = null, string $city = 'Gurugram'): Society
    {
        return Society::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.uniqid(),
            'locality' => $localityName,
            'locality_id' => $locality?->id,
            'city' => $city,
            'state' => 'Haryana',
        ]);
    }

    public function test_the_default_run_changes_nothing(): void
    {
        $this->locality('sec-36');
        $this->locality('Premium Gurgaon Corridor');

        $this->artisan('societies:normalize-localities')->assertSuccessful();

        $this->assertSame('sec-36', Locality::where('slug', 'sec-36')->value('name'));
        $this->assertSame('published', Locality::where('slug', 'premium-gurgaon-corridor')->value('published_status'));
    }

    /** The whole point: one page per place, and every society lands on it. */
    public function test_spelling_variants_merge_into_the_canonical_locality(): void
    {
        $canonical = $this->locality('Sector 36');
        $variant = $this->locality('sec-36');
        $society = $this->society('Some Towers', 'sec-36', $variant);

        $this->artisan('societies:normalize-localities', ['--apply' => true])->assertSuccessful();

        $this->assertNull(Locality::find($variant->id), 'the empty duplicate should be gone');
        $this->assertSame($canonical->id, $society->fresh()->locality_id);
    }

    /** A merged-away row someone wrote copy for must not be deleted silently. */
    public function test_a_duplicate_holding_written_content_is_demoted_not_deleted(): void
    {
        $this->locality('Sector 36');
        $variant = $this->locality('sec-36', 'Gurugram', ['description' => 'Hand-written locality copy.']);

        $this->artisan('societies:normalize-localities', ['--apply' => true])->assertSuccessful();

        $this->assertNotNull(Locality::find($variant->id));
        $this->assertSame('draft', $variant->fresh()->published_status);
    }

    public function test_names_that_are_not_places_are_unpublished(): void
    {
        $marketing = $this->locality('Premium Gurgaon Corridor');
        $cityName = $this->locality('Gurugram');
        $address = $this->locality('Dwarka Expressway, Village Babupur');
        $block = $this->locality('Block A');
        $real = $this->locality('Golf Course Extension Road');

        $this->artisan('societies:normalize-localities', ['--apply' => true])->assertSuccessful();

        foreach ([$marketing, $cityName, $address, $block] as $junk) {
            $this->assertSame('draft', $junk->fresh()->published_status, $junk->name.' should not be a page');
        }

        $this->assertSame('published', $real->fresh()->published_status, 'a real road must survive');
    }

    /** Renaming without a rival row keeps the same locality and repairs its slug. */
    public function test_a_lone_variant_is_renamed_in_place(): void
    {
        $variant = $this->locality('Sector-63A');

        $this->artisan('societies:normalize-localities', ['--apply' => true])->assertSuccessful();

        $this->assertSame('Sector 63A', $variant->fresh()->name);
        $this->assertSame('sector-63a', $variant->fresh()->slug);
    }

    public function test_city_corrections_need_their_own_flag(): void
    {
        $locality = $this->locality('Tagore Garden Extension');
        $society = $this->society('West Delhi Heights', 'Tagore Garden Extension', $locality);

        $this->artisan('societies:normalize-localities', ['--apply' => true])->assertSuccessful();
        $this->assertSame('Gurugram', $locality->fresh()->city, 'apply alone must not move cities');

        $this->artisan('societies:normalize-localities', ['--apply' => true, '--fix-cities' => true])->assertSuccessful();

        $this->assertSame('Delhi', $locality->fresh()->city);
        $this->assertSame('Delhi', $society->fresh()->city, 'the society must move with its locality');
    }

    public function test_the_name_rules_reject_junk_and_keep_real_places(): void
    {
        $names = app(LocalityNameService::class);

        foreach (['Premium Gurgaon Corridor', 'Gurugram', 'Gurgaon', 'Block A', 'Dwarka Expressway, Village Babupur', 'NCR'] as $junk) {
            $this->assertNotNull($names->rejectionReason($junk, 'Gurugram'), $junk.' should be rejected');
        }

        foreach (['Sector 63A', 'Golf Course Extension Road', 'Gwal Pahari', 'DLF Phase IV', 'Paschim Vihar', 'Manesar'] as $place) {
            $this->assertNull($names->rejectionReason($place, 'Gurugram'), $place.' should be accepted');
        }

        $this->assertSame('Sector 36', $names->canonicalise('sec-36'));
        $this->assertSame('Sector 63A', $names->canonicalise('Sector-63A'));
        $this->assertSame('Sector 35-36', $names->canonicalise('Sec-35-36'));
        $this->assertSame('DLF Phase IV', $names->canonicalise('DLF Phase IV'));
        $this->assertSame('Gwal Pahari', $names->canonicalise('gwal pahari'));
    }
}
