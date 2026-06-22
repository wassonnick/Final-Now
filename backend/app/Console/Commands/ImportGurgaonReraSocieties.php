<?php

namespace App\Console\Commands;

use App\Models\Society;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ImportGurgaonReraSocieties extends Command
{
    protected $signature = 'societies:import-gurgaon-rera
        {--source=https://sitesetu.app/rera/haryana/gurgaon : Public directory URL to import from}
        {--limit=0 : Maximum records to import, 0 imports all found records}
        {--include-commercial : Also import commercial, retail, office and serviced-apartment projects}
        {--dry-run : Preview records without writing to the database}';

    protected $description = 'Import public Gurgaon RERA project entries as draft society profiles.';

    public function handle(): int
    {
        $source = (string) $this->option('source');
        $limit = max(0, (int) $this->option('limit'));
        $includeCommercial = (bool) $this->option('include-commercial');
        $dryRun = (bool) $this->option('dry-run');

        $this->info("Fetching {$source}");

        $response = Http::timeout(30)
            ->withHeaders(['User-Agent' => 'SocietyFlats draft importer (+https://societyflats.com)'])
            ->get($source);

        if (! $response->successful()) {
            $this->error("Import source returned HTTP {$response->status()}.");

            return self::FAILURE;
        }

        $records = $this->parseDirectory($response->body(), $source, $includeCommercial);

        if ($limit > 0) {
            $records = array_slice($records, 0, $limit);
        }

        if (! $records) {
            $this->warn('No Gurgaon RERA records found.');

            return self::SUCCESS;
        }

        $created = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($records as $record) {
            $existing = Society::query()
                ->where('slug', $record['slug'])
                ->orWhere(function ($query) use ($record) {
                    $query->whereRaw('LOWER(name) = ?', [mb_strtolower($record['name'])]);

                    if (! empty($record['sector']) || ! empty($record['locality'])) {
                        $query->where(function ($location) use ($record) {
                            if (! empty($record['sector'])) {
                                $location->orWhereRaw('LOWER(COALESCE(sector, ?)) = ?', ['', mb_strtolower($record['sector'])]);
                            }

                            if (! empty($record['locality'])) {
                                $location->orWhereRaw('LOWER(COALESCE(locality, ?)) = ?', ['', mb_strtolower($record['locality'])]);
                            }
                        });
                    }
                })
                ->first();

            if ($existing) {
                $skipped++;
                $this->warn("Skipped duplicate: {$record['name']} matches society ID {$existing->id}.");

                continue;
            }

            if ($dryRun) {
                $created++;
                $this->line(sprintf(
                    '- %s | %s | %s',
                    $record['name'],
                    $record['builder'] ?: 'builder unknown',
                    $record['source_url']
                ));

                continue;
            }

            try {
                Society::create($record + [
                    'status' => 'Draft',
                    'verification_status' => 'needs_verification',
                    'is_published' => false,
                    'published_at' => null,
                    'featured' => false,
                    'show_in_hero' => false,
                    'search_boost' => false,
                    'image_approved_by_admin' => false,
                    'score' => 8.0,
                    'data_quality' => 'Imported draft - verify before publishing',
                    'imported_at' => now(),
                ]);
                $created++;
            } catch (\Throwable $exception) {
                $failed++;
                $this->error("Failed {$record['name']}: {$exception->getMessage()}");
            }
        }

        $summary = [
            'mode' => $dryRun ? 'dry-run' : 'import',
            'total_rows' => count($records),
            $dryRun ? 'would_create' : 'created' => $created,
            'skipped_duplicates' => $skipped,
            'failed' => $failed,
        ];

        $this->info($dryRun ? 'Dry run complete. No database rows were written.' : 'RERA draft import complete.');
        $this->line('SUMMARY '.json_encode($summary, JSON_UNESCAPED_SLASHES));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function parseDirectory(string $html, string $source, bool $includeCommercial): array
    {
        $previous = libxml_use_internal_errors(true);
        $dom = new \DOMDocument;
        $dom->loadHTML($html);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new \DOMXPath($dom);
        $anchors = $xpath->query('//a[contains(@href, "/rera/haryana/gurgaon/")]');
        $records = [];

        foreach ($anchors as $anchor) {
            $href = trim((string) $anchor->getAttribute('href'));
            $text = $this->cleanText((string) $anchor->textContent);

            if (! $href || ! $text || $href === '/rera/haryana/gurgaon' || $href === '/rera/haryana/gurgaon/') {
                continue;
            }

            $slug = Str::slug(basename($href));
            $url = str_starts_with($href, 'http') ? $href : rtrim($source, '/').'/'.$slug;
            $name = $this->projectNameFromSlug($slug);
            $builder = $this->builderFromText($text, $name);
            $location = $this->locationFromText($text);
            $reraNumber = $this->reraNumberFromText($text);

            if (! $includeCommercial && $this->looksCommercial($name, $text)) {
                continue;
            }

            if (! $name || isset($records[$slug])) {
                continue;
            }

            $records[$slug] = [
                'name' => $name,
                'slug' => $slug,
                'builder' => $builder,
                'sector' => $this->sectorFromLocation($location),
                'locality' => $location ?: 'Gurugram',
                'address' => $location,
                'description' => "Imported public RERA draft for {$name}. Verify project details, media, amenities and market data before publishing.",
                'meta_title' => "{$name} Gurgaon - Society Profile",
                'meta_description' => "Draft SocietyFlats profile for {$name} in Gurgaon. Imported from public RERA directory data and pending manual verification.",
                'rera_number' => $reraNumber,
                'source_name' => 'Site Setu Gurgaon RERA directory',
                'source_url' => $url,
            ];
        }

        return array_values($records);
    }

    private function cleanText(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', html_entity_decode($text, ENT_QUOTES | ENT_HTML5)) ?: '');
    }

    private function projectNameFromSlug(string $slug): string
    {
        return Str::of($slug)
            ->replace('-', ' ')
            ->title()
            ->replaceMatches('/\b(Gh|Nh|Mvn|M3M|Aipl|Dlf|Ireo|Ddjay)\b/i', fn ($match) => strtoupper($match[0]))
            ->toString();
    }

    private function builderFromText(string $text, string $name): ?string
    {
        if (preg_match('/\s*by\s+(.+?)(?:\s*(?:Sector|Village|GH|Khasra|Real Estate|Approved|Continuing|Return|RERA No\.|Premium Segment|On request|On Request)|$)/i', $text, $matches)) {
            return trim($matches[1]);
        }

        $candidate = $this->removeProjectNamePrefix($text, $name);

        if ($candidate && preg_match('/^(.+?(?:Private Limited|Pvt\.?\s*Ltd\.?|Limited|LLP|Ltd\.?|Developers?|Builders?|Realty|Infrastructure|Projects?))(?:\s|$)/i', $candidate, $matches)) {
            return trim($matches[1]);
        }

        if (preg_match('/\s((?:[A-Z][A-Za-z&().-]*\s?){1,6}(?:Private Limited|Pvt\.?\s*Ltd\.?|Limited|LLP|Group|Developers?|Builders?))$/i', $text, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    private function removeProjectNamePrefix(string $text, string $name): string
    {
        $normalizedText = preg_replace('/[^a-z0-9]+/i', '', $text) ?: '';
        $normalizedName = preg_replace('/[^a-z0-9]+/i', '', $name) ?: '';

        if ($normalizedName && stripos($normalizedText, $normalizedName) === 0) {
            $remaining = substr($normalizedText, strlen($normalizedName));

            return trim(preg_replace('/([a-z])([A-Z])/', '$1 $2', $remaining) ?: $remaining);
        }

        return trim($text);
    }

    private function locationFromText(string $text): ?string
    {
        if (preg_match('/((?:Sector|Village|GH|Khasra)[^,]*(?:,\s*[^,]*Gurugram|,\s*Gurugram|\s+Gurugram)?)/i', $text, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    private function sectorFromLocation(?string $location): ?string
    {
        if ($location && preg_match('/Sector[\s‑-]*[0-9A-Za-z]+/i', $location, $matches)) {
            return str_replace('‑', '-', trim($matches[0]));
        }

        return null;
    }

    private function reraNumberFromText(string $text): ?string
    {
        if (preg_match('/RERA[-\s]?GRG[-\s]?[0-9]+[-\s]?[0-9]+/i', $text, $matches)) {
            return strtoupper(str_replace(' ', '-', trim($matches[0])));
        }

        return null;
    }

    private function looksCommercial(string $name, string $text): bool
    {
        $haystack = Str::lower($name.' '.$text);

        foreach ([
            'commercial',
            'retail',
            'office',
            'shop',
            'shops',
            'sco',
            'mall',
            'plaza',
            'market',
            'business park',
            'serviced apartment',
            'managed serviced apartment',
            'food court',
            'multiplex',
            'industrial',
            'warehouse',
            'it park',
        ] as $keyword) {
            if (preg_match('/\b'.preg_quote($keyword, '/').'\b/i', $haystack)) {
                return true;
            }
        }

        return false;
    }
}
