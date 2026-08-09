<?php

namespace Tests\Feature;

use App\Models\Locality;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class BackfillSocietyLocalitiesTest extends TestCase
{
    use RefreshDatabase;

    private function society(string $name, string $locality, string $city): Society
    {
        return Society::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.uniqid(),
            'locality' => $locality,
            'city' => $city,
            'state' => $city === 'Noida' ? 'Uttar Pradesh' : 'Haryana',
        ]);
    }

    /** A report-only run must not write, or the preview is worthless. */
    public function test_the_default_run_creates_nothing(): void
    {
        $this->society('Kartik Kunj', 'Sector 62', 'Noida');

        $this->artisan('societies:backfill-localities')->assertSuccessful();

        $this->assertSame(0, Locality::count());
    }

    /** Several societies in one locality produce one row, and every one gets linked. */
    public function test_apply_creates_each_locality_once_and_links_every_society(): void
    {
        $a = $this->society('Kartik Kunj', 'Sector 62', 'Noida');
        $b = $this->society('Sunder Vihar', 'Sector 62', 'Noida');
        $c = $this->society('DLF Magnolias', 'Sector 42', 'Gurugram');

        $this->artisan('societies:backfill-localities', ['--apply' => true])->assertSuccessful();

        $this->assertSame(2, Locality::count());

        $sector62 = Locality::where('slug', 'sector-62')->firstOrFail();
        $this->assertSame('Noida', $sector62->city);
        $this->assertSame('published', $sector62->published_status);

        $this->assertSame($sector62->id, $a->fresh()->locality_id);
        $this->assertSame($sector62->id, $b->fresh()->locality_id);
        $this->assertSame(Locality::where('slug', 'sector-42')->value('id'), $c->fresh()->locality_id);
    }

    /** Restricting to a city must leave every other city untouched. */
    public function test_the_city_filter_is_respected(): void
    {
        $this->society('Kartik Kunj', 'Sector 62', 'Noida');
        $gurgaon = $this->society('DLF Magnolias', 'Sector 42', 'Gurugram');

        $this->artisan('societies:backfill-localities', ['--apply' => true, '--city' => 'Noida'])->assertSuccessful();

        $this->assertSame(1, Locality::count());
        $this->assertNull($gurgaon->fresh()->locality_id);
    }
}
