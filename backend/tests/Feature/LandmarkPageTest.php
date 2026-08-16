<?php

namespace Tests\Feature;

use App\Models\Landmark;
use App\Models\Society;
use App\Services\Seo\LandmarkPageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Proximity pages are only worth publishing if every line on them is a measured fact.
 *
 * These hold the two rules that keep them honest: a page needs enough nearby societies to
 * say anything, and the links between a society and its landmark pages must point at pages
 * that actually exist.
 */
class LandmarkPageTest extends TestCase
{
    use RefreshDatabase;

    private function landmark(string $name, float $lat, float $lng): Landmark
    {
        return Landmark::create([
            'name' => $name, 'slug' => str($name)->slug()->value(), 'category' => 'office',
            'city' => 'Gurugram', 'latitude' => $lat, 'longitude' => $lng, 'source' => 'curated',
        ]);
    }

    private function society(string $name, float $lat, float $lng): Society
    {
        return Society::create([
            'name' => $name, 'slug' => str($name)->slug()->value(), 'city' => 'Gurugram',
            'status' => 'Verified', 'is_published' => true, 'score' => 8,
            'latitude' => $lat, 'longitude' => $lng, 'sector' => 'Sector 24',
        ]);
    }

    /**
     * Every seeded landmark must survive a fresh migrate.
     *
     * The seeder only ever ran from the create-table migration, so adding landmarks to the
     * file changed nothing on any environment that had already migrated. This asserts the
     * catalogue the seeder describes is the catalogue a deployed database actually has.
     */
    public function test_the_seeded_landmark_catalogue_reaches_a_migrated_database(): void
    {
        $seeded = Landmark::count();

        $this->assertGreaterThanOrEqual(80, $seeded, 'the landmark seed did not reach the database');

        foreach (['Gurugram', 'Delhi', 'Noida', 'Greater Noida'] as $city) {
            $this->assertGreaterThanOrEqual(
                3,
                Landmark::where('city', $city)->count(),
                "{$city} has too few landmarks to carry a page",
            );
        }

        // Coordinates are the whole point; a landmark without them can measure nothing.
        $this->assertSame(0, Landmark::whereNull('latitude')->orWhereNull('longitude')->count());
    }

    public function test_a_landmark_without_enough_societies_gets_no_page(): void
    {
        $this->landmark('Lonely Office', 28.50, 77.09);
        $this->society('Only One', 28.505, 77.095);

        $this->assertCount(0, app(LandmarkPageService::class)->publishable());
        $this->getJson('/api/landmark-pages/lonely-office')->assertNotFound();
    }

    public function test_a_page_lists_societies_nearest_first_with_measured_distances(): void
    {
        $landmark = $this->landmark('Busy Office', 28.50, 77.09);
        $this->society('Far Court', 28.55, 77.09);
        $this->society('Near Court', 28.502, 77.091);
        $this->society('Middle Court', 28.52, 77.09);

        $payload = $this->getJson('/api/landmark-pages/busy-office')->assertSuccessful()->json('data');

        $this->assertSame(3, $payload['society_count']);
        $this->assertSame(['Near Court', 'Middle Court', 'Far Court'], array_column($payload['societies'], 'name'));

        $distances = array_column($payload['societies'], 'distance_km');
        $this->assertSame($distances, collect($distances)->sort()->values()->all());
        $this->assertLessThan(1, $distances[0]);

        // Every field the audit grades, inside its own bands.
        $this->assertLessThanOrEqual(65, mb_strlen($payload['title']));
        $this->assertGreaterThanOrEqual(30, mb_strlen($payload['title']));
        $this->assertLessThanOrEqual(170, mb_strlen($payload['meta_description']));
        $this->assertGreaterThanOrEqual(90, mb_strlen($payload['meta_description']));

        unset($landmark);
    }

    /** A society links only to landmark pages that exist, never into a 404. */
    public function test_society_links_point_only_at_real_pages(): void
    {
        $this->landmark('Busy Office', 28.50, 77.09);
        $this->landmark('Quiet Office', 28.51, 77.10);

        $society = $this->society('Near Court', 28.502, 77.091);
        $this->society('Second Court', 28.503, 77.092);
        $this->society('Third Court', 28.504, 77.093);

        $links = app(LandmarkPageService::class)->forSociety($society);

        $this->assertNotEmpty($links);
        foreach ($links as $link) {
            $this->getJson('/api/landmark-pages/'.$link['slug'])->assertSuccessful();
            $this->assertStringContainsString('from', $link['label']);
        }
    }

    /**
     * The whole catalogue is loaded once, not once per landmark.
     *
     * nearby() re-queried every published society on each call, and it is called once per
     * landmark by publishable(), again by siblings(), and again per candidate on a society
     * page. In production that made the landmark index take 59 seconds and put a share of
     * the same cost on every society detail request.
     */
    public function test_a_page_loads_the_catalogue_once(): void
    {
        foreach (range(1, 8) as $i) {
            $this->landmark('Office '.$i, 28.50 + $i / 1000, 77.09);
        }
        foreach (range(1, 6) as $i) {
            $this->society('Court '.$i, 28.502, 77.091 + $i / 1000);
        }

        \Illuminate\Support\Facades\DB::enableQueryLog();
        app(LandmarkPageService::class)->payload(\App\Models\Landmark::where('slug', 'office-1')->firstOrFail());
        $log = collect(\Illuminate\Support\Facades\DB::getQueryLog());
        \Illuminate\Support\Facades\DB::disableQueryLog();

        // Aggregates are cheap and expected — the fingerprint keying the cache runs a count
        // and a max. What must not repeat is pulling the whole catalogue into memory.
        $fullLoads = $log
            ->filter(fn ($q) => str_contains($q['query'], 'from "societies"'))
            ->reject(fn ($q) => str_contains($q['query'], 'count(') || str_contains($q['query'], 'max('))
            ->count();

        $this->assertLessThanOrEqual(1, $fullLoads, "the societies catalogue was loaded {$fullLoads} times for one page");
    }

    /** A society with no coordinates cannot be placed, and is not guessed at. */
    public function test_a_society_without_coordinates_has_no_landmark_links(): void
    {
        $this->landmark('Busy Office', 28.50, 77.09);
        $society = Society::create([
            'name' => 'No Fix', 'slug' => 'no-fix', 'city' => 'Gurugram',
            'status' => 'Verified', 'is_published' => true,
        ]);

        $this->assertSame([], app(LandmarkPageService::class)->forSociety($society));
    }
}
