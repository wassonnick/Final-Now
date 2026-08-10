<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Locality;
use App\Models\Region;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Ten places create a society and locality linking lived in one of them, so the importer —
 * which creates most of them — produced societies carrying a sector name with no locality
 * behind it. These pin the behaviour to the model, not to any one caller.
 */
class SocietyLocalityLinkingTest extends TestCase
{
    use RefreshDatabase;

    private function city(string $name, string $slug, string $state): City
    {
        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);

        return City::firstOrCreate(['slug' => $slug], [
            'region_id' => $region->id, 'name' => $name, 'state' => $state, 'is_active' => true,
        ]);
    }

    private function make(array $attributes): Society
    {
        return Society::create(array_merge([
            'name' => 'S'.uniqid(),
            'slug' => Str::slug('s'.uniqid()),
        ], $attributes));
    }

    /** The importer path: created straight on the model, never through the controller. */
    public function test_a_society_created_anywhere_gets_its_locality(): void
    {
        $noida = $this->city('Noida', 'noida', 'Uttar Pradesh');

        $society = $this->make(['sector' => 'Sector 150', 'locality' => 'Sector 150', 'city' => 'Noida', 'city_id' => $noida->id, 'state' => 'Uttar Pradesh']);

        $locality = Locality::where('slug', 'sector-150')->firstOrFail();
        $this->assertSame($locality->id, $society->locality_id);
        $this->assertSame('Noida', $locality->city);
    }

    /** Sector-only rows are the common importer shape and must work the same. */
    public function test_the_sector_is_used_when_there_is_no_locality_text(): void
    {
        $society = $this->make(['sector' => 'Sector 104', 'city' => 'Gurugram']);

        $this->assertNotNull($society->locality_id);
        $this->assertSame('Sector 104', Locality::find($society->locality_id)->name);
    }

    /** Many societies in one sector share one locality — the count is the launch gate. */
    public function test_societies_in_the_same_sector_share_one_locality(): void
    {
        $noida = $this->city('Noida', 'noida', 'Uttar Pradesh');

        $a = $this->make(['locality' => 'Sector 44', 'city' => 'Noida', 'city_id' => $noida->id]);
        $b = $this->make(['locality' => 'Sector 44', 'city' => 'Noida', 'city_id' => $noida->id]);

        $this->assertSame($a->locality_id, $b->locality_id);
        $this->assertSame(1, Locality::where('slug', 'sector-44')->count());
    }

    /** The same sector number in two cities stays two places. */
    public function test_the_city_still_scopes_the_locality(): void
    {
        $gurugram = $this->city('Gurugram', 'gurgaon', 'Haryana');
        $noida = $this->city('Noida', 'noida', 'Uttar Pradesh');

        $a = $this->make(['locality' => 'Sector 44', 'city' => 'Gurugram', 'city_id' => $gurugram->id]);
        $b = $this->make(['locality' => 'Sector 44', 'city' => 'Noida', 'city_id' => $noida->id]);

        $this->assertNotSame($a->locality_id, $b->locality_id);
    }

    /** An explicitly chosen locality is a decision, not a guess to be overridden. */
    public function test_an_explicit_locality_is_never_second_guessed(): void
    {
        $chosen = Locality::create(['name' => 'Golf Course Road', 'slug' => 'golf-course-road', 'city' => 'Gurugram', 'state' => 'Haryana', 'published_status' => 'published']);

        $society = $this->make(['locality' => 'Sector 54', 'locality_id' => $chosen->id, 'city' => 'Gurugram']);

        $this->assertSame($chosen->id, $society->locality_id);
    }

    /** Editing the locality text used to change the label and leave the link behind. */
    public function test_renaming_the_locality_text_relinks_the_society(): void
    {
        $society = $this->make(['locality' => 'Sector 54', 'city' => 'Gurugram']);
        $before = $society->locality_id;

        $society->update(['locality' => 'Sector 65']);

        $this->assertNotSame($before, $society->fresh()->locality_id);
        $this->assertSame('Sector 65', Locality::find($society->fresh()->locality_id)->name);
    }

    /** Ad copy still must not become a locality page. */
    public function test_a_marketing_phrase_creates_no_locality(): void
    {
        $society = $this->make(['locality' => 'Premium Gurgaon Corridor', 'city' => 'Gurugram']);

        $this->assertNull($society->locality_id);
        $this->assertSame(0, Locality::count());
    }
}
