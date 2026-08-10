<?php

namespace App\Console\Commands;

use App\Models\City;
use App\Models\Locality;
use App\Services\Society\Import\SocietyDiscoveryService;
use Illuminate\Console\Command;

/**
 * Scans the catalogue's own localities for societies it does not have.
 *
 * The areas come from the localities already in the catalogue, so coverage deepens where
 * there is inventory rather than sprawling into places with none.
 */
class DiscoverSocieties extends Command
{
    protected $signature = 'societies:discover
        {--area= : Scan one area, e.g. "Sector 65 Gurgaon"}
        {--city= : Scan every published locality in this city}
        {--limit=10 : Maximum areas to scan in one run}';

    protected $description = 'Find societies present in the market but missing from the catalogue.';

    public function handle(SocietyDiscoveryService $discovery): int
    {
        if (! $discovery->configured()) {
            $this->error('Google Places API key is not configured.');

            return self::FAILURE;
        }

        $areas = $this->areas();

        if ($areas === []) {
            $this->warn('Nothing to scan. Pass --area, or --city with published localities.');

            return self::SUCCESS;
        }

        $rows = [];

        foreach ($areas as [$area, $city]) {
            $result = $discovery->scan($area, $city);

            $rows[] = [
                $area,
                $result['status'] === 'ok' ? $result['scanned'] : '—',
                $result['status'] === 'ok' ? $result['new'] : '—',
                $result['status'] === 'ok' ? $result['likely_duplicate'] : '—',
                $result['status'] === 'ok' ? $result['known'] : '—',
                $result['message'] ?? '',
            ];
        }

        $this->table(['Area', 'Seen', 'Missing', 'Maybe dupe', 'Already have', 'Note'], $rows);
        $this->info('Review them in admin under Discovery before importing.');

        return self::SUCCESS;
    }

    /** @return array<int,array{0:string,1:?City}> */
    private function areas(): array
    {
        $limit = max(1, (int) $this->option('limit'));

        if ($area = $this->option('area')) {
            return [[(string) $area, null]];
        }

        if (! $cityName = $this->option('city')) {
            return [];
        }

        $city = City::query()->where('name', $cityName)->orWhere('slug', $cityName)->first();

        if (! $city) {
            $this->error('No city called "'.$cityName.'".');

            return [];
        }

        return Locality::query()
            ->where('city_id', $city->id)
            ->where('published_status', 'published')
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (Locality $locality) => [$locality->name.' '.$city->name, $city])
            ->all();
    }
}
