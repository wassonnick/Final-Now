<?php
namespace Tests\Feature;
use App\Services\Society\Import\SocietyImageScreenService;
use Tests\TestCase;

class ImageScreenCacheKeyTest extends TestCase
{
    private function key(array $candidate): ?string
    {
        $m = new \ReflectionMethod(SocietyImageScreenService::class, 'cacheKey');
        $m->setAccessible(true);

        return $m->invoke(app(SocietyImageScreenService::class), $candidate);
    }

    /**
     * A verdict must not outlive the prompt that produced it. Ansal Celebrity Homes kept
     * a boundary-wall cover after the strict Street View rules shipped, because a lenient
     * OK from an hour earlier was cached against the image identity alone.
     */
    public function test_the_key_is_scoped_to_the_prompt_version(): void
    {
        $key = $this->key(['photo_reference' => 'streetview:28.4,77.0', 'source' => 'google_street_view']);

        $this->assertStringContainsString('society_image_screen:v', $key);
        $this->assertMatchesRegularExpression('/society_image_screen:v\d+:/', $key);
    }

    /** The two sources are judged by different prompts, so they cannot share a verdict. */
    public function test_street_view_and_places_verdicts_never_share_a_key(): void
    {
        $identity = ['photo_reference' => 'same-identity'];

        $this->assertNotSame(
            $this->key($identity + ['source' => 'google_street_view']),
            $this->key($identity + ['source' => 'google_places']),
        );
    }

    public function test_an_identityless_candidate_is_not_cached(): void
    {
        $this->assertNull($this->key(['source' => 'google_places']));
    }
}
