<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Landmark;
use App\Models\Region;
use App\Models\Society;
use App\Services\Search\LandmarkQueryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * People looking for a home rarely know which society they want. They know the office they
 * commute to and the mall they like, and every one of those searches used to come back
 * empty because search only understood society names, sectors and localities.
 */
class LandmarkSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['features.home_city_slugs' => ['gurgaon']]);
        $this->seed(\Database\Seeders\LandmarkSeeder::class);

        $region = Region::firstOrCreate(['slug' => 'delhi-ncr'], ['name' => 'Delhi NCR']);
        City::firstOrCreate(['slug' => 'gurgaon'], ['region_id' => $region->id, 'name' => 'Gurugram', 'state' => 'Haryana', 'is_active' => true]);
    }

    private function society(string $name, float $lat, float $lng, float $score = 8.0): Society
    {
        return Society::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'city' => 'Gurugram',
            'locality' => 'Sector 24',
            'latitude' => (string) $lat,
            'longitude' => (string) $lng,
            'status' => 'Verified',
            'is_published' => true,
            'score' => $score,
        ]);
    }

    /** The phrasing people actually use. */
    public function test_it_understands_how_people_write_a_landmark_search(): void
    {
        $queries = app(LandmarkQueryService::class);

        foreach ([
            '3 bhk near ambience mall' => ['Ambience Mall Gurgaon', '3 bhk'],
            'flat close to cyber hub' => ['DLF Cyber Hub', 'flat'],
            'walking distance from huda city centre metro' => ['HUDA City Centre Metro', ''],
            'home around sector 18 noida' => ['Noida Sector 18 Market', 'home'],
            'apartment next to medanta hospital' => ['Medanta The Medicity', 'apartment'],
            'rent near cybercity gurgaon' => ['DLF Cyber City', 'rent'],
        ] as $query => [$expectedLandmark, $expectedRemainder]) {
            $parsed = $queries->parse($query);

            $this->assertNotNull($parsed['landmark'], "no landmark found in: {$query}");
            $this->assertSame($expectedLandmark, $parsed['landmark']->name, $query);
            $this->assertSame($expectedRemainder, $parsed['remainder'], "remainder for: {$query}");
        }
    }

    /** A number in the phrase is a radius, not part of the name. */
    public function test_it_reads_a_distance_out_of_the_query(): void
    {
        $queries = app(LandmarkQueryService::class);

        $this->assertSame(3.0, $queries->parse('within 3 km of ambience mall')['radius_km']);
        // Minutes are a distance in disguise.
        $this->assertSame(5.0, $queries->parse('10 minutes from cyber city')['radius_km']);
    }

    /** An ordinary search must not be mistaken for a landmark one. */
    public function test_a_plain_search_is_left_alone(): void
    {
        $parsed = app(LandmarkQueryService::class)->parse('dlf the crest');

        $this->assertNull($parsed['landmark']);
        $this->assertSame('dlf the crest', $parsed['remainder']);
    }

    /** The answer to "near X" is a list ordered by how near. */
    public function test_results_come_back_nearest_first_with_the_distance(): void
    {
        // Ambience Mall sits at 28.5041, 77.0968.
        $far = $this->society('Far Towers', 28.4700, 77.1000);
        $near = $this->society('Close Court', 28.5060, 77.0980);
        $middle = $this->society('Middle Heights', 28.4900, 77.0950);

        $response = $this->getJson('/api/search/near?q=3+bhk+near+ambience+mall&learn=0')->assertSuccessful();

        $this->assertSame('Ambience Mall Gurgaon', $response->json('landmark.name'));
        $this->assertSame('3 bhk', $response->json('remainder'));

        $names = collect($response->json('societies'))->pluck('name')->all();
        $this->assertSame(['Close Court', 'Middle Heights', 'Far Towers'], $names);

        $distances = collect($response->json('societies'))->pluck('distance_km');
        $this->assertLessThan(0.5, $distances[0], 'The nearest society is a few hundred metres away.');
        $this->assertSame($distances->sort()->values()->all(), $distances->all(), 'Sorted by distance.');
    }

    public function test_societies_beyond_the_radius_are_left_out(): void
    {
        $this->society('Close Court', 28.5060, 77.0980);
        $this->society('Manesar Far Away', 28.3536, 76.9364);

        $names = collect($this->getJson('/api/search/near?q=near+ambience+mall&learn=0')->json('societies'))->pluck('name');

        $this->assertContains('Close Court', $names->all());
        $this->assertNotContains('Manesar Far Away', $names->all());
    }

    /** A society with no coordinates cannot be ranked by distance, and is not guessed at. */
    public function test_a_society_without_coordinates_is_skipped(): void
    {
        Society::create([
            'name' => 'No Coordinates', 'slug' => 'no-coordinates', 'city' => 'Gurugram',
            'status' => 'Verified', 'is_published' => true, 'score' => 9.9,
        ]);
        $this->society('Close Court', 28.5060, 77.0980);

        $names = collect($this->getJson('/api/search/near?q=near+ambience+mall&learn=0')->json('societies'))->pluck('name');

        $this->assertSame(['Close Court'], $names->all());
    }

    /**
     * A sentence that names no landmark must not be sent to Google.
     *
     * "park facing home in golf course" is a description of a home, not a place. It was
     * being looked up anyway, came back as Delhi Golf Club, and the results page then
     * announced itself as "nearest to" somewhere the user had never mentioned — while
     * billing for the lookup that got it wrong.
     */
    public function test_a_query_without_a_proximity_phrase_is_never_looked_up(): void
    {
        config(['services.google_places_api_key' => 'test-key']);
        Http::fake(['places.googleapis.com/*' => Http::response(['places' => [[
            'id' => 'place-golf', 'displayName' => ['text' => 'Delhi Golf Club'],
            'location' => ['latitude' => 28.5931, 'longitude' => 77.2400],
        ]]], 200)]);

        $this->society('Close Court', 28.5060, 77.0980);

        $this->getJson('/api/search/near?q=park+facing+home+in+golf+course')
            ->assertSuccessful()
            ->assertJsonPath('landmark', null);

        Http::assertNothingSent();
    }

    /**
     * Commute shortcuts follow the city being browsed.
     *
     * The brief builder offered Cyber Hub and Udyog Vihar to someone looking in Delhi,
     * because the list was hard-coded to Gurgaon.
     */
    public function test_landmark_shortcuts_are_scoped_to_the_city(): void
    {
        $names = collect($this->getJson('/api/landmarks?city=Delhi')->assertSuccessful()->json('data'))
            ->pluck('name');

        $this->assertNotEmpty($names);
        foreach ($names as $name) {
            $this->assertStringNotContainsString('Cyber', $name);
        }

        $gurgaon = collect($this->getJson('/api/landmarks?city=Gurgaon')->json('data'))->pluck('city')->unique();
        $this->assertTrue($gurgaon->every(fn ($city) => in_array($city, ['Gurgaon', 'Gurugram'], true)));
    }

    /** An unknown landmark is learnt once from Google, then it is ours. */
    public function test_an_unknown_landmark_is_looked_up_once_and_kept(): void
    {
        config(['services.google_places_api_key' => 'test-key']);

        Http::fake(['places.googleapis.com/*' => Http::response(['places' => [[
            'id' => 'place-worldmark',
            'displayName' => ['text' => 'Worldmark Gurugram'],
            'location' => ['latitude' => 28.5045, 'longitude' => 77.0975],
        ]]], 200)]);

        $this->society('Close Court', 28.5060, 77.0980);

        $this->getJson('/api/search/near?q=near+worldmark+gurugram')
            ->assertSuccessful()
            ->assertJsonPath('landmark.name', 'Worldmark Gurugram');

        $saved = Landmark::where('slug', 'worldmark-gurugram')->firstOrFail();
        $this->assertSame('google_places', $saved->source);

        // Second search must not cost another lookup.
        Http::fake(['places.googleapis.com/*' => Http::response([], 500)]);
        $this->getJson('/api/search/near?q=near+worldmark+gurugram')
            ->assertSuccessful()
            ->assertJsonPath('landmark.name', 'Worldmark Gurugram');
    }
}
