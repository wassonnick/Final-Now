<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Locality;
use App\Models\Region;
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

    private function ncr(): void
    {
        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);
        foreach ([['Gurugram', 'gurgaon', 'Haryana'], ['Delhi', 'delhi', 'Delhi'], ['Noida', 'noida', 'Uttar Pradesh'], ['Greater Noida', 'greater-noida', 'Uttar Pradesh']] as [$name, $slug, $state]) {
            City::firstOrCreate(['slug' => $slug], ['region_id' => $region->id, 'name' => $name, 'state' => $state, 'is_active' => true]);
        }
    }

    /**
     * The scan box takes "Pitampura Delhi", and that phrase became the locality — eighteen
     * societies on it against two on "Pitampura". One neighbourhood, two pages.
     */
    public function test_a_city_suffixed_name_is_not_a_separate_locality(): void
    {
        $this->ncr();
        $names = app(LocalityNameService::class);

        $this->assertSame('Pitampura', $names->canonicalise('Pitampura Delhi'));
        $this->assertSame('Paschim Vihar', $names->canonicalise('Paschim Vihar Delhi'));
        $this->assertSame('Sector 44', $names->canonicalise('Sector 44 Noida'));
        $this->assertSame('Sector 65', $names->canonicalise('Sector 65 Gurgaon'));
        // Greater Noida must be stripped whole, not leave "Greater" behind.
        $this->assertSame('Sector 1', $names->canonicalise('Sector 1 Greater Noida'));
    }

    /** A locality genuinely named after its city must not be emptied to nothing. */
    public function test_a_bare_city_name_survives_canonicalisation(): void
    {
        $this->ncr();

        $this->assertSame('Delhi', app(LocalityNameService::class)->canonicalise('Delhi'));
    }

    /** The production case: the suffixed row holds the inventory and still loses the name. */
    public function test_the_suffixed_twin_merges_into_the_real_locality(): void
    {
        $this->ncr();
        $delhi = City::where('slug', 'delhi')->firstOrFail();

        $real = $this->locality('Pitampura', 'Delhi');
        $suffixed = $this->locality('Pitampura Delhi', 'Delhi');
        $real->update(['city_id' => $delhi->id]);
        $suffixed->update(['city_id' => $delhi->id]);

        $onReal = $this->society('Small One', 'Pitampura', $real);
        $bulk = collect(range(1, 4))->map(fn ($i) => $this->society("Bulk {$i}", 'Pitampura Delhi', $suffixed));

        $this->artisan('societies:normalize-localities', ['--apply' => true])->assertSuccessful();

        $this->assertNull(Locality::find($suffixed->id), 'The search phrase must not survive as a place.');
        $this->assertSame($real->id, $onReal->fresh()->locality_id);
        foreach ($bulk as $society) {
            $this->assertSame($real->id, $society->fresh()->locality_id, 'Its societies move to the real locality.');
        }
    }

    /** "Janak Puri" and "Janakpuri" are one neighbourhood spelt two ways. */
    public function test_spacing_variants_merge(): void
    {
        $this->ncr();
        $delhi = City::where('slug', 'delhi')->firstOrFail();

        $populated = $this->locality('Janakpuri', 'Delhi');
        $empty = $this->locality('Janak Puri', 'Delhi');
        $populated->update(['city_id' => $delhi->id]);
        $empty->update(['city_id' => $delhi->id]);
        $society = $this->society('Some Flats', 'Janakpuri', $populated);

        $this->artisan('societies:normalize-localities', ['--apply' => true])->assertSuccessful();

        $this->assertSame(1, Locality::whereIn('id', [$populated->id, $empty->id])->count());
        $this->assertSame($populated->id, $society->fresh()->locality_id, 'The row holding inventory wins the tie.');
    }

    /** Localities were written with a city name and no city_id, so they counted for nothing. */
    public function test_a_locality_links_its_own_city(): void
    {
        $this->ncr();

        $locality = Locality::create([
            'name' => 'Karol Bagh', 'slug' => 'karol-bagh', 'city' => 'New Delhi',
            'state' => 'Delhi', 'published_status' => 'published',
        ]);

        $this->assertSame(City::where('slug', 'delhi')->value('id'), $locality->city_id);
        $this->assertSame('Delhi', $locality->city, 'Stored under the catalogue spelling, not Google\'s.');
    }
}
