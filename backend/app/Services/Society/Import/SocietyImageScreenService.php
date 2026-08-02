<?php

namespace App\Services\Society\Import;

use App\Services\GooglePlacesSocietyImageService;
use App\Services\Ops\AiBudgetGuard;
use App\Services\Ops\AiSpendTracker;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Looks at a harvested candidate and decides whether it can front a society page.
 *
 * Resolution ranking and official-domain validation between them fix *where* a photo
 * came from and *how big* it is, and neither can see what is in the frame. The images
 * that embarrass us are exactly the ones those two filters pass: a broker's poster with
 * a phone number burned across it, somebody's family standing in the lobby, a floor
 * plan, a screenshot of a listing page. Those need something that actually looks.
 *
 * The screen is deliberately cheap and deliberately conservative:
 *  - Haiku at a small max-width; a poster is legible at 640px.
 *  - Results are cached by candidate identity, so re-harvesting a society, or the same
 *    Google photo appearing under two societies, never pays twice.
 *  - It runs on the background lane behind the budget guard, and a screen that cannot
 *    run returns UNKNOWN. Unknown never rejects — an unscreened queue is the status quo,
 *    a queue silently emptied by an outage is a regression.
 */
class SocietyImageScreenService
{
    public const VERDICT_OK = 'ok';

    public const VERDICT_REJECTED = 'rejected';

    public const VERDICT_UNKNOWN = 'unknown';

    /** Screening every one of 12 candidates is mostly wasted; the tail is never chosen. */
    public const MAX_SCREENED = 8;

    private const CACHE_DAYS = 60;

    public function __construct(
        private readonly AiBudgetGuard $budget,
        private readonly AiSpendTracker $spend,
        private readonly GooglePlacesSocietyImageService $places,
    ) {
    }

    public function enabled(): bool
    {
        return (bool) config('services.claude.image_screen_enabled', true)
            && trim((string) config('services.claude.api_key', '')) !== '';
    }

    /**
     * Screen a candidate list in place, annotating each with `screen` metadata.
     *
     * @param  array<int,array<string,mixed>>  $candidates
     * @return array{candidates:array<int,array<string,mixed>>, screened:int, rejected:int, skipped:int}
     */
    public function screenAll(array $candidates, string $societyName = ''): array
    {
        $screened = 0;
        $rejected = 0;
        $skipped = 0;

        foreach ($candidates as $i => $candidate) {
            if ($i >= self::MAX_SCREENED) {
                $skipped++;

                continue;
            }

            $result = $this->screen($candidate, $societyName);
            $candidates[$i]['screen'] = $result;

            if ($result['verdict'] === self::VERDICT_REJECTED) {
                // Kept in the payload rather than dropped: an admin who disagrees can
                // still see what was filtered and why, which a silent drop never allows.
                $candidates[$i]['approved'] = false;
                $candidates[$i]['is_cover'] = false;
                $rejected++;
            }

            if ($result['verdict'] !== self::VERDICT_UNKNOWN) {
                $screened++;
            }
        }

        return [
            'candidates' => $candidates,
            'screened' => $screened,
            'rejected' => $rejected,
            'skipped' => $skipped,
        ];
    }

    /**
     * @param  array<string,mixed>  $candidate
     * @return array{verdict:string, reasons:array<int,string>, note:?string, at:string}
     */
    public function screen(array $candidate, string $societyName = ''): array
    {
        $key = $this->cacheKey($candidate);

        if ($key !== null) {
            $cached = Cache::get($key);
            if (is_array($cached)) {
                return $cached;
            }
        }

        if (! $this->enabled()) {
            return $this->unknown('screening disabled');
        }

        if (! $this->budget->allow(AiBudgetGuard::LANE_BACKGROUND) || $this->budget->providerLimited()) {
            return $this->unknown('AI budget or provider limit reached');
        }

        $image = $this->imageBytes($candidate);
        if ($image === null) {
            return $this->unknown('image could not be fetched');
        }

        $model = (string) config('services.claude.image_screen_model', 'claude-haiku-4-5');
        $this->budget->record();

        try {
            $client = new \Anthropic\Client(apiKey: trim((string) config('services.claude.api_key', '')));
            $response = $client->messages->create(
                maxTokens: 200,
                messages: [[
                    'role' => 'user',
                    'content' => [
                        ['type' => 'image', 'source' => [
                            'type' => 'base64',
                            'media_type' => $image['media_type'],
                            'data' => base64_encode($image['body']),
                        ]],
                        ['type' => 'text', 'text' => $this->prompt($societyName, ($candidate['source'] ?? '') === 'google_street_view')],
                    ],
                ]],
                model: $model,
            );

            $this->spend->recordAnthropicText('society_import', 'image_screen', $model, $response, [
                'metadata' => ['society' => $societyName ?: null],
            ]);

            $result = $this->parse($this->text($response));
        } catch (\Throwable $e) {
            $this->spend->recordFailure('anthropic', 'society_import', 'image_screen', $model, $e, [
                'metadata' => ['society' => $societyName ?: null],
            ]);

            if (AiBudgetGuard::isProviderLimit([
                '_ai_error_status' => (int) (($e->status ?? 0)),
                '_ai_error' => $e->getMessage(),
            ])) {
                $this->budget->tripProviderLimit();
            }

            Log::warning('Society image screen failed', ['error' => $e->getMessage()]);

            return $this->unknown('screen call failed');
        }

        if ($key !== null && $result['verdict'] !== self::VERDICT_UNKNOWN) {
            Cache::put($key, $result, now()->addDays(self::CACHE_DAYS));
        }

        return $result;
    }

    private function prompt(string $societyName, bool $isStreetView = false): string
    {
        $subject = $societyName !== '' ? '"'.$societyName.'", a residential apartment society in India' : 'an Indian residential apartment society';

        // A Places photo was taken by someone who meant to photograph the place. A Street
        // View frame is whatever faced the car, so the generous reading that lets
        // "grounds and landscaping" through passes a boundary wall behind trees and an
        // empty field with pylons — both of which went live as covers.
        if ($isStreetView) {
            return <<<TXT
            You are screening a Google Street View frame for use as the main image on a property listing page for {$subject}.

            This is a road-facing camera view, not a photograph someone composed, so judge it strictly.

            ACCEPT only if a residential building or its formal entrance is clearly visible and recognisably the subject: towers or blocks in the frame, or a named gate, gatehouse or boundary entrance.

            REJECT everything else, including:
            - A plain boundary wall, fence or hedge with no building visible.
            - Empty land, scrub, undergrowth, fields or a construction site.
            - Mostly road, traffic, parked vehicles, pylons or power lines.
            - Trees or foliage obscuring whatever is behind them.
            - A building too distant or too obscured to tell what it is.

            "Some greenery is visible" is not a reason to accept. If a prospective tenant could not tell which building this is, reject it.

            Reply with exactly two lines and nothing else:
            VERDICT: OK or REJECT
            REASONS: a comma-separated list from [no_building_visible, empty_land, obscured, mostly_road, low_quality, off_topic], or none
            TXT;
        }

        return <<<TXT
        You are screening a photograph for use as the main image on a property listing page for {$subject}.

        REJECT the image if any of these are true:
        - A phone number, email address, price, website address, or any promotional/marketing text is overlaid or printed on the image (broker posters, hoardings, "for sale" boards, watermarked adverts).
        - People are a main subject: faces, portraits, selfies, groups, staff, an event crowd. Small distant figures in a wide exterior shot are fine.
        - It is a floor plan, site map, brochure page, price list, document, or a screenshot of a website or app.
        - It is a logo, a business card, a text-only banner, or a photo collage/grid.
        - It shows something other than the property: food, a vehicle interior, a pet, a shop counter, a random street scene.
        - It is too dark, too blurry, or too cropped to tell what building it is.

        ACCEPT clean photographs of the buildings, towers, entrance/gate, grounds, landscaping, clubhouse, pool, lobby, corridors, or apartment interiors.

        Reply with exactly two lines and nothing else:
        VERDICT: OK or REJECT
        REASONS: a comma-separated list from [overlaid_text, phone_number, people, floor_plan, document, screenshot, logo, collage, off_topic, low_quality], or none
        TXT;
    }

    /** @return array{verdict:string, reasons:array<int,string>, note:?string, at:string} */
    private function parse(string $text): array
    {
        if (! preg_match('/VERDICT\s*:\s*(OK|REJECT)/i', $text, $m)) {
            return $this->unknown('unparseable screen reply');
        }

        $reasons = [];
        if (preg_match('/REASONS\s*:\s*(.+)/i', $text, $r)) {
            $reasons = collect(explode(',', $r[1]))
                ->map(fn ($v) => strtolower(trim($v)))
                ->filter(fn ($v) => $v !== '' && $v !== 'none')
                ->unique()
                ->take(6)
                ->values()
                ->all();
        }

        return [
            'verdict' => strtoupper($m[1]) === 'OK' ? self::VERDICT_OK : self::VERDICT_REJECTED,
            'reasons' => $reasons,
            'note' => null,
            'at' => now()->toIso8601String(),
        ];
    }

    /** @return array{verdict:string, reasons:array<int,string>, note:?string, at:string} */
    private function unknown(string $note): array
    {
        return ['verdict' => self::VERDICT_UNKNOWN, 'reasons' => [], 'note' => $note, 'at' => now()->toIso8601String()];
    }

    /**
     * @param  array<string,mixed>  $candidate
     * @return array{body:string, media_type:string}|null
     */
    private function imageBytes(array $candidate): ?array
    {
        $reference = trim((string) ($candidate['photo_reference'] ?? ''));

        if ($reference !== '') {
            try {
                $photo = $this->places->fetchPhotoByReference($reference, 640);

                return ['body' => $photo['body'], 'media_type' => $this->mediaType($photo['content_type'])];
            } catch (\Throwable $e) {
                Log::info('Image screen could not fetch a Places photo', ['error' => $e->getMessage()]);

                return null;
            }
        }

        $url = trim((string) ($candidate['url'] ?? ''));
        if ($url === '' || ! filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        try {
            $response = Http::timeout(15)
                ->withHeaders(['User-Agent' => 'SocietyFlats Importer/2.0'])
                ->get($url);

            $type = strtolower((string) $response->header('Content-Type'));
            if (! $response->successful() || ! str_starts_with($type, 'image/')) {
                return null;
            }

            $body = (string) $response->body();

            // The vision endpoint caps request size; anything larger is a print asset
            // we would not publish uncompressed anyway.
            if ($body === '' || strlen($body) > 4_500_000) {
                return null;
            }

            return ['body' => $body, 'media_type' => $this->mediaType($type)];
        } catch (\Throwable) {
            return null;
        }
    }

    private function mediaType(string $contentType): string
    {
        $type = strtolower(trim(explode(';', $contentType)[0]));

        return in_array($type, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], true) ? $type : 'image/jpeg';
    }

    private function text(mixed $response): string
    {
        $out = '';
        foreach ((array) ($response->content ?? []) as $block) {
            $type = is_array($block) ? ($block['type'] ?? null) : ($block->type ?? null);
            if ($type === 'text') {
                $out .= is_array($block) ? (string) ($block['text'] ?? '') : (string) ($block->text ?? '');
            }
        }

        return trim($out);
    }

    /** @param  array<string,mixed>  $candidate */
    private function cacheKey(array $candidate): ?string
    {
        $identity = trim((string) ($candidate['photo_reference'] ?? '')) ?: trim((string) ($candidate['url'] ?? ''));

        return $identity === '' ? null : 'society_image_screen:'.sha1($identity);
    }
}
