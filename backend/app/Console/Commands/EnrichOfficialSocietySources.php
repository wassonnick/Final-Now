<?php

namespace App\Console\Commands;

use App\Models\Society;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class EnrichOfficialSocietySources extends Command
{
    protected $signature = 'societies:enrich-official-sources
        {--limit=0 : Maximum societies to process, 0 processes all}
        {--overwrite : Overwrite existing factual fields}
        {--delay=2 : Delay between requests in seconds}';

    protected $description = 'Safely enrich blank society fields from saved official project URLs without copying images.';

    public function handle(): int
    {
        $limit = max(0, (int) $this->option('limit'));
        $overwrite = (bool) $this->option('overwrite');
        $delay = max(0, (int) $this->option('delay'));

        $query = Society::query()
            ->whereNotNull('official_project_url')
            ->where('official_project_url', '!=', '')
            ->orderBy('name');

        if ($limit > 0) {
            $query->limit($limit);
        }

        $processed = 0;
        $enriched = 0;
        $failed = 0;

        foreach ($query->get() as $society) {
            $processed++;
            $url = (string) $society->official_project_url;
            $this->line("Checking {$society->name}: {$url}");

            if (!$this->robotsAllows($url)) {
                $society->update([
                    'official_source_status' => 'needs_manual_review',
                    'official_source_last_checked_at' => now(),
                    'official_source_notes' => 'robots.txt disallows automated fetch. Needs manual verification.',
                ]);
                $this->warn('  skipped by robots.txt');
                continue;
            }

            try {
                $response = Http::timeout(30)
                    ->withHeaders(['User-Agent' => 'SocietyFlats official-source enricher (+https://societyflats.com)'])
                    ->get($url);
            } catch (\Throwable $exception) {
                $failed++;
                $society->update([
                    'official_source_status' => 'failed',
                    'official_source_last_checked_at' => now(),
                    'official_source_notes' => Str::limit('Fetch failed: '.$exception->getMessage(), 500, ''),
                ]);
                $this->error('  fetch failed');
                continue;
            }

            if (!$response->successful()) {
                $failed++;
                $society->update([
                    'official_source_status' => 'failed',
                    'official_source_last_checked_at' => now(),
                    'official_source_notes' => "HTTP {$response->status()} from official project URL.",
                ]);
                $this->error("  HTTP {$response->status()}");
                continue;
            }

            $html = $response->body();
            $text = $this->pageText($html);
            $links = $this->linksFromHtml($html, $url);
            $updates = $this->factualUpdates($society, $text, $links, $overwrite);
            $updates['official_source_last_checked_at'] = now();
            $updates['official_source_status'] = count($updates) > 2 ? 'enriched' : 'found';
            $updates['official_source_notes'] = $this->notesFor($updates, $society);

            $society->update($updates);
            $enriched++;

            $this->info('  updated: '.implode(', ', array_keys($updates)));

            if ($delay > 0) {
                sleep($delay);
            }
        }

        $this->info("Official source enrichment complete. Processed {$processed}, enriched {$enriched}, failed {$failed}.");

        return self::SUCCESS;
    }

    private function robotsAllows(string $url): bool
    {
        $parts = parse_url($url);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? null;
        $path = $parts['path'] ?? '/';

        if (!$host) {
            return false;
        }

        try {
            $response = Http::timeout(10)->get("{$scheme}://{$host}/robots.txt");
        } catch (\Throwable) {
            return true;
        }

        if (!$response->successful()) {
            return true;
        }

        $applies = false;
        foreach (preg_split('/\R/', $response->body()) ?: [] as $line) {
            $line = trim(preg_replace('/#.*/', '', $line));
            if ($line === '') {
                continue;
            }
            if (preg_match('/^User-agent:\s*(.+)$/i', $line, $matches)) {
                $applies = trim($matches[1]) === '*';
                continue;
            }
            if ($applies && preg_match('/^Disallow:\s*(.+)$/i', $line, $matches)) {
                $disallow = trim($matches[1]);
                if ($disallow !== '' && Str::startsWith($path, $disallow)) {
                    return false;
                }
            }
        }

        return true;
    }

    private function pageText(string $html): string
    {
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', ' ', $html);
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', ' ', $html);

        return trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags((string) $html), ENT_QUOTES | ENT_HTML5)));
    }

    /**
     * @return array<string, string>
     */
    private function linksFromHtml(string $html, string $baseUrl): array
    {
        $links = [];
        if (!preg_match_all('/<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is', $html, $matches, PREG_SET_ORDER)) {
            return $links;
        }

        foreach ($matches as $match) {
            $href = $this->absoluteUrl($match[1], $baseUrl);
            $label = trim(preg_replace('/\s+/', ' ', strip_tags($match[2])));

            if ($href) {
                $links[$href] = $label;
            }
        }

        return $links;
    }

    /**
     * @param array<string, string> $links
     * @return array<string, mixed>
     */
    private function factualUpdates(Society $society, string $text, array $links, bool $overwrite): array
    {
        $updates = [];
        $this->setField($updates, $society, 'meta_description', Str::limit($text, 155, ''), $overwrite);

        if (preg_match('/RERA[\s-]*(?:GRG|GGM|PROJ)?[\s-]*[A-Z0-9-]+/i', $text, $matches)) {
            $this->setField($updates, $society, 'rera_number', trim($matches[0]), $overwrite);
        }
        if (preg_match('/([0-9]+)\s+(?:towers?|residential\s+blocks?)/i', $text, $matches)) {
            $this->setField($updates, $society, 'total_towers', $matches[1], $overwrite);
        }
        if (preg_match('/([0-9,]+)\s+units?/i', $text, $matches)) {
            $this->setField($updates, $society, 'total_units', str_replace(',', '', $matches[1]), $overwrite);
        }
        if (preg_match('/(?:possession|completion|completed|ready)[^0-9]{0,30}(20[0-9]{2})/i', $text, $matches)) {
            $this->setField($updates, $society, 'year_built', $matches[1], $overwrite);
        }

        $amenities = array_values(array_unique(array_merge($society->amenities ?: [], $this->amenitiesFromText($text))));
        if (($overwrite || empty($society->amenities)) && $amenities) {
            $updates['amenities'] = $amenities;
        }

        foreach ($links as $href => $label) {
            $haystack = Str::lower($href.' '.$label);
            if (!$society->official_brochure_url && str_contains($haystack, 'brochure')) {
                $updates['official_brochure_url'] = $href;
            }
            if (!$society->official_floor_plan_url && (str_contains($haystack, 'floor') || str_contains($haystack, 'plan'))) {
                $updates['official_floor_plan_url'] = $href;
            }
            if (!$society->official_gallery_url && (str_contains($haystack, 'gallery') || str_contains($haystack, 'photo'))) {
                $updates['official_gallery_url'] = $href;
            }
        }

        return $updates;
    }

    private function setField(array &$updates, Society $society, string $field, ?string $value, bool $overwrite): void
    {
        if ($value && ($overwrite || !$society->{$field})) {
            $updates[$field] = $value;
        }
    }

    /**
     * @param array<string, mixed> $updates
     */
    private function notesFor(array $updates, Society $society): string
    {
        $fields = array_diff(array_keys($updates), ['official_source_last_checked_at', 'official_source_status', 'official_source_notes']);
        $source = $society->official_project_url ?: 'official project URL';

        return $fields
            ? 'Factual fields updated from '.$source.': '.implode(', ', $fields).'. Images were not downloaded.'
            : 'Official source checked. Needs manual verification for missing fields. Images were not downloaded.';
    }

    private function absoluteUrl(string $url, string $baseUrl): ?string
    {
        if (Str::startsWith($url, ['http://', 'https://'])) {
            return $url;
        }

        if (Str::startsWith($url, ['#', 'mailto:', 'tel:', 'javascript:'])) {
            return null;
        }

        $scheme = parse_url($baseUrl, PHP_URL_SCHEME) ?: 'https';
        $host = parse_url($baseUrl, PHP_URL_HOST);

        if (!$host) {
            return null;
        }

        if (Str::startsWith($url, '//')) {
            return "{$scheme}:{$url}";
        }

        return $scheme.'://'.$host.'/'.ltrim($url, '/');
    }

    /**
     * @return string[]
     */
    private function amenitiesFromText(string $text): array
    {
        $map = [
            'clubhouse' => 'Clubhouse',
            'club house' => 'Clubhouse',
            'swimming pool' => 'Swimming Pool',
            'gym' => 'Gym',
            'fitness' => 'Gym',
            'kids' => 'Kids Play Area',
            'children' => 'Kids Play Area',
            'tennis' => 'Tennis Court',
            'badminton' => 'Badminton Court',
            'basketball' => 'Basketball Court',
            'jogging' => 'Jogging Track',
            'power backup' => 'Power Backup',
            'security' => '24x7 Security',
            'cctv' => 'CCTV',
            'landscape' => 'Landscaped Greens',
            'green' => 'Landscaped Greens',
        ];

        $haystack = Str::lower($text);
        $amenities = [];

        foreach ($map as $needle => $amenity) {
            if (str_contains($haystack, $needle)) {
                $amenities[] = $amenity;
            }
        }

        return $amenities;
    }
}
