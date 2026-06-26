<?php

namespace App\Services\Society\Import;

/**
 * Deterministic, explainable society scoring engine.
 *
 * Input: an assembled "facts" array (authoritative Google data + grounded
 * enrichment). Output: the six Society scores plus a per-score breakdown of
 * the signals, weights and confidence behind each number.
 *
 * Principles:
 *  - Every score traces back to a measurable signal (real POI distances,
 *    amenities, builder/locality tiers, resident rating, yield, age, status).
 *  - Missing data lowers a category's CONFIDENCE and renormalizes weights over
 *    the signals we actually have — it is never replaced with a fabricated value.
 *  - Thin overall data is penalized so a near-empty society cannot score high.
 *
 * Pure: no DB, no HTTP. Config lives in config/society_scoring.php.
 */
class SocietyScoringService
{
    private array $config;

    public function __construct(?array $config = null)
    {
        $this->config = $config ?? (array) config('society_scoring', []);
    }

    /**
     * @return array{scores: array<string,float>, breakdown: array<string,mixed>, confidence: float}
     */
    public function score(array $facts): array
    {
        $connectivity = $this->connectivity($facts);
        $lifestyle = $this->lifestyle($facts);
        $security = $this->security($facts);
        $maintenance = $this->maintenance($facts);
        $investment = $this->investment($facts, $connectivity['value']);

        $categories = [
            'connectivity' => $connectivity,
            'lifestyle' => $lifestyle,
            'security' => $security,
            'maintenance' => $maintenance,
            'investment' => $investment,
        ];

        $overall = $this->overall($categories);

        return [
            'scores' => [
                'score' => $overall['value'],
                'connectivity_score' => $connectivity['value'],
                'lifestyle_score' => $lifestyle['value'],
                'security_score' => $security['value'],
                'maintenance_score' => $maintenance['value'],
                'investment_score' => $investment['value'],
            ],
            'breakdown' => array_merge($categories, ['overall' => $overall]),
            'confidence' => $overall['confidence'],
        ];
    }

    // ---- Categories -------------------------------------------------------

    private function connectivity(array $facts): array
    {
        $cfg = $this->config['connectivity'];
        $weights = $cfg['weights'];
        $locality = $this->localityTier($facts);

        $metroM = $this->nearestDistance($facts, 'metro');
        $officeM = $this->nearestDistance($facts, 'office');
        $airportM = $this->airportDistance($facts);

        $signals = [
            'metro' => $this->signal(
                $metroM !== null ? $this->distanceCurve($metroM, $cfg['curves']['metro']) : null,
                $weights['metro'],
                $metroM !== null ? round($metroM).'m to nearest metro/transit' : 'no metro distance',
                ['distance_m' => $metroM]
            ),
            'office' => $this->signal(
                $officeM !== null ? $this->distanceCurve($officeM, $cfg['curves']['office']) : null,
                $weights['office'],
                $officeM !== null ? round($officeM).'m to nearest office hub' : 'no office-hub distance',
                ['distance_m' => $officeM]
            ),
            'airport' => $this->signal(
                $airportM !== null ? $this->distanceCurve($airportM, $cfg['curves']['airport']) : null,
                $weights['airport'],
                $airportM !== null ? round($airportM / 1000, 1).'km to '.$this->config['airport']['label'] : 'no coordinates for airport leg',
                ['distance_m' => $airportM]
            ),
            'locality' => $this->signal(
                $locality['present'] ? $locality['tier']['connectivity'] : null,
                $weights['locality'],
                'micro-market access: '.$locality['name'],
                ['tier' => $locality['name']]
            ),
        ];

        return $this->blend($signals);
    }

    private function lifestyle(array $facts): array
    {
        $cfg = $this->config['lifestyle'];
        $weights = $cfg['weights'];
        $locality = $this->localityTier($facts);
        $amenities = $this->amenityList($facts);

        $amenityValue = null;
        if ($amenities !== []) {
            $groups = $this->config['amenity_groups'];
            $premium = $this->countMatches($amenities, $groups['lifestyle_premium']);
            $standard = $this->countMatches($amenities, $groups['lifestyle_standard']);
            $amenityValue = $this->clampScore(
                $cfg['amenity_base'] + $premium * $cfg['premium_amenity_points'] + $standard * $cfg['standard_amenity_points'],
                0,
                $cfg['amenity_cap']
            );
        }

        $nearby = $facts['nearby']['lifestyle'] ?? null;
        $nearbyValue = is_array($nearby)
            ? min(count($nearby) / max(1, (int) $cfg['nearby_full_count']), 1.0) * 10
            : null;

        $signals = [
            'amenities' => $this->signal($amenityValue, $weights['amenities'], 'amenity richness', ['count' => count($amenities)]),
            'locality' => $this->signal($locality['present'] ? $locality['tier']['prestige'] : null, $weights['locality'], 'micro-market prestige: '.$locality['name']),
            'nearby' => $this->signal($nearbyValue, $weights['nearby'], 'nearby lifestyle density', ['count' => is_array($nearby) ? count($nearby) : null]),
        ];

        return $this->blend($signals);
    }

    private function security(array $facts): array
    {
        $cfg = $this->config['security'];
        $weights = $cfg['weights'];
        $amenities = $this->amenityList($facts);
        $builder = $this->builderTier($facts);
        $rating = $this->ratingScore($facts);

        $amenityValue = null;
        if ($amenities !== []) {
            $count = $this->countMatches($amenities, $this->config['amenity_groups']['security']);
            $amenityValue = $this->clampScore($cfg['amenity_base'] + $count * $cfg['amenity_point'], 0, $cfg['amenity_cap']);
        }

        $signals = [
            'amenities' => $this->signal($amenityValue, $weights['amenities'], 'on-site security amenities'),
            'builder' => $this->signal($builder['present'] ? $builder['score'] : null, $weights['builder'], 'builder operations: tier '.$builder['tier']),
            'rating' => $this->signal($rating['value'], $weights['rating'], $rating['label']),
        ];

        return $this->blend($signals);
    }

    private function maintenance(array $facts): array
    {
        $cfg = $this->config['maintenance'];
        $weights = $cfg['weights'];
        $builder = $this->builderTier($facts);
        $rating = $this->ratingScore($facts);
        $age = $this->ageScore($facts);

        $signals = [
            'builder' => $this->signal($builder['present'] ? $builder['score'] : null, $weights['builder'], 'builder/agency tier '.$builder['tier']),
            'age' => $this->signal($age['value'], $weights['age'], $age['label']),
            'rating' => $this->signal($rating['value'], $weights['rating'], $rating['label']),
        ];

        return $this->blend($signals);
    }

    private function investment(array $facts, float $connectivityValue): array
    {
        $cfg = $this->config['investment'];
        $weights = $cfg['weights'];
        $locality = $this->localityTier($facts);
        $builder = $this->builderTier($facts);
        $yield = $this->yieldScore($facts);
        $status = $this->statusScore($facts);

        // Unconfirmed Gemini market estimates contribute at reduced weight.
        $yieldWeight = $weights['yield'];
        if ($yield['present'] && empty($facts['market_confirmed'])) {
            $yieldWeight *= (float) $cfg['unconfirmed_market_weight'];
        }

        $signals = [
            'yield' => $this->signal($yield['value'], $yieldWeight, $yield['label']),
            'growth' => $this->signal($locality['present'] ? $locality['tier']['growth'] : null, $weights['growth'], 'micro-market growth: '.$locality['name']),
            'builder' => $this->signal($builder['present'] ? $builder['score'] : null, $weights['builder'], 'builder resale strength: tier '.$builder['tier']),
            'connectivity' => $this->signal($connectivityValue, $weights['connectivity'], 'connectivity feed-in'),
            'status' => $this->signal($status['value'], $weights['status'], $status['label']),
        ];

        return $this->blend($signals);
    }

    private function overall(array $categories): array
    {
        $weights = $this->config['weights'];
        $valueSum = 0.0;
        $confSum = 0.0;
        $weightSum = 0.0;

        foreach ($weights as $key => $weight) {
            $valueSum += $categories[$key]['value'] * $weight;
            $confSum += $categories[$key]['confidence'] * $weight;
            $weightSum += $weight;
        }

        $rawValue = $weightSum > 0 ? $valueSum / $weightSum : $this->config['neutral'];
        $confidence = $weightSum > 0 ? $confSum / $weightSum : 0.0;

        // Penalize thin data so a near-empty society cannot score deceptively high.
        $penalty = (float) $this->config['confidence_penalty'] * (1 - $confidence);

        return [
            'value' => $this->bound($rawValue - $penalty),
            'confidence' => round($confidence, 2),
            'raw' => round($rawValue, 2),
            'confidence_penalty' => round($penalty, 2),
            'weights' => $weights,
        ];
    }

    // ---- Signal helpers ---------------------------------------------------

    private function signal(?float $value, float $weight, string $label, array $meta = []): array
    {
        return [
            'present' => $value !== null,
            'value' => $value !== null ? round($value, 2) : null,
            'weight' => round($weight, 4),
            'label' => $label,
        ] + ($meta === [] ? [] : ['meta' => $meta]);
    }

    /**
     * Weighted mean over the signals that are present; renormalizes weights and
     * reports confidence = (present weight / total weight). Clamped to bounds.
     */
    private function blend(array $signals): array
    {
        $presentWeight = 0.0;
        $totalWeight = 0.0;
        $valueSum = 0.0;

        foreach ($signals as $signal) {
            $totalWeight += $signal['weight'];
            if ($signal['present']) {
                $presentWeight += $signal['weight'];
                $valueSum += $signal['value'] * $signal['weight'];
            }
        }

        $value = $presentWeight > 0 ? $valueSum / $presentWeight : (float) $this->config['neutral'];
        $confidence = $totalWeight > 0 ? $presentWeight / $totalWeight : 0.0;

        return [
            'value' => $this->bound($value),
            'confidence' => round($confidence, 2),
            'signals' => $signals,
        ];
    }

    // ---- Signal computations ---------------------------------------------

    private function builderTier(array $facts): array
    {
        $haystack = $this->lower(($facts['builder'] ?? '').' '.($facts['name'] ?? ''));
        $tiers = $this->config['builder_tiers'];

        foreach (['A', 'B', 'C'] as $tier) {
            foreach ($tiers[$tier]['names'] as $needle) {
                if ($needle !== '' && str_contains($haystack, $needle)) {
                    return ['present' => true, 'tier' => $tier, 'score' => (float) $tiers[$tier]['score']];
                }
            }
        }

        $known = trim((string) ($facts['builder'] ?? '')) !== '' && $this->lower((string) $facts['builder']) !== 'to be verified';

        return ['present' => $known, 'tier' => 'default', 'score' => (float) $tiers['default']['score']];
    }

    private function localityTier(array $facts): array
    {
        $haystack = $this->lower(implode(' ', array_filter([
            $facts['locality'] ?? '', $facts['sector'] ?? '', $facts['address'] ?? '',
        ])));
        $tiers = $this->config['locality_tiers'];

        if ($haystack !== '') {
            foreach (['premium', 'prime', 'growth', 'value'] as $name) {
                foreach ($tiers[$name]['names'] as $needle) {
                    if ($needle !== '' && str_contains($haystack, $needle)) {
                        return ['present' => true, 'name' => $name, 'tier' => $tiers[$name]];
                    }
                }
            }

            return ['present' => true, 'name' => 'default', 'tier' => $tiers['default']];
        }

        return ['present' => false, 'name' => 'unknown', 'tier' => $tiers['default']];
    }

    private function ratingScore(array $facts): array
    {
        $rating = $this->toFloat($facts['rating'] ?? null);
        if ($rating === null || $rating <= 0) {
            return ['value' => null, 'label' => 'no resident rating'];
        }

        $count = (int) ($facts['rating_count'] ?? 0);
        $min = (int) ($this->config['rating']['min_reviews_for_confidence'] ?? 20);
        $note = $count < $min ? ' (low review count)' : '';

        return [
            'value' => $this->clampScore($rating * 2, 0, 10),
            'label' => "resident rating {$rating}/5{$note}",
        ];
    }

    private function ageScore(array $facts): array
    {
        $year = $this->extractYear($facts['year_built'] ?? null);
        if ($year === null) {
            return ['value' => null, 'label' => 'no construction year'];
        }

        $curve = $this->config['maintenance']['age_curve'];
        $age = (int) date('Y') - $year;
        $value = $this->distanceCurve(
            max(0, $age),
            ['full_m' => $curve['new_years'], 'zero_m' => $curve['old_years'], 'floor' => $curve['floor']]
        );

        return ['value' => $value, 'label' => "project age ~{$age} yrs"];
    }

    private function yieldScore(array $facts): array
    {
        $pct = $this->extractPercent($facts['rental_yield'] ?? null);
        if ($pct === null) {
            return ['present' => false, 'value' => null, 'label' => 'no rental yield'];
        }

        $curve = $this->config['investment']['yield_curve'];
        $value = $this->distanceCurveAscending($pct, $curve['low_pct'], $curve['high_pct'], $curve['floor']);

        return ['present' => true, 'value' => $value, 'label' => "rental yield {$pct}%"];
    }

    private function statusScore(array $facts): array
    {
        $status = $this->lower((string) ($facts['project_status'] ?? '').' '.($facts['possession_date'] ?? ''));
        if (trim($status) === '') {
            return ['value' => null, 'label' => 'no delivery status'];
        }

        $scores = $this->config['investment']['status_scores'];
        foreach ($scores as $needle => $value) {
            if ($needle !== 'default' && str_contains($status, $needle)) {
                return ['value' => (float) $value, 'label' => "delivery status: {$needle}"];
            }
        }

        return ['value' => (float) $scores['default'], 'label' => 'delivery status: unspecified'];
    }

    // ---- Math / parsing ---------------------------------------------------

    /** Descending distance curve: <= full ⇒ 10, >= zero ⇒ floor, linear between. */
    private function distanceCurve(float $distance, array $curve): float
    {
        $full = (float) $curve['full_m'];
        $zero = (float) $curve['zero_m'];
        $floor = (float) $curve['floor'];

        if ($distance <= $full) {
            return 10.0;
        }
        if ($distance >= $zero || $zero <= $full) {
            return $floor;
        }

        return round(10 - (10 - $floor) * ($distance - $full) / ($zero - $full), 2);
    }

    /** Ascending curve: <= low ⇒ floor, >= high ⇒ 10, linear between. */
    private function distanceCurveAscending(float $value, float $low, float $high, float $floor): float
    {
        if ($value <= $low || $high <= $low) {
            return $floor;
        }
        if ($value >= $high) {
            return 10.0;
        }

        return round($floor + (10 - $floor) * ($value - $low) / ($high - $low), 2);
    }

    private function airportDistance(array $facts): ?float
    {
        $lat = $this->toFloat($facts['latitude'] ?? null);
        $lng = $this->toFloat($facts['longitude'] ?? null);
        if ($lat === null || $lng === null || ($lat == 0.0 && $lng == 0.0)) {
            return null;
        }

        return $this->haversine($lat, $lng, (float) $this->config['airport']['lat'], (float) $this->config['airport']['lng']);
    }

    private function nearestDistance(array $facts, string $key): ?float
    {
        $list = $facts['nearby'][$key] ?? null;
        if (! is_array($list) || $list === []) {
            return null;
        }

        $distances = [];
        foreach ($list as $item) {
            $d = $this->toFloat(is_array($item) ? ($item['distance_m'] ?? null) : null);
            if ($d !== null && $d >= 0) {
                $distances[] = $d;
            }
        }

        return $distances === [] ? null : min($distances);
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function amenityList(array $facts): array
    {
        $amenities = $facts['amenities'] ?? [];

        return is_array($amenities)
            ? array_values(array_filter(array_map(fn ($a) => $this->lower((string) $a), $amenities)))
            : [];
    }

    private function countMatches(array $amenities, array $needles): int
    {
        $count = 0;
        foreach ($needles as $needle) {
            foreach ($amenities as $amenity) {
                if ($needle !== '' && str_contains($amenity, $needle)) {
                    $count++;
                    break;
                }
            }
        }

        return $count;
    }

    private function extractYear(mixed $value): ?int
    {
        if ($value === null) {
            return null;
        }
        if (preg_match('/(19|20)\d{2}/', (string) $value, $m)) {
            $year = (int) $m[0];
            if ($year >= 1980 && $year <= (int) date('Y') + 1) {
                return $year;
            }
        }

        return null;
    }

    private function extractPercent(mixed $value): ?float
    {
        if ($value === null) {
            return null;
        }
        if (is_numeric($value)) {
            $n = (float) $value;

            return $n > 0 && $n < 25 ? $n : null;
        }
        // Pull all numbers (e.g. "3% - 4%") and average them.
        if (preg_match_all('/\d+(?:\.\d+)?/', (string) $value, $m) && $m[0] !== []) {
            $nums = array_map('floatval', $m[0]);
            $nums = array_filter($nums, fn ($n) => $n > 0 && $n < 25);
            if ($nums !== []) {
                return round(array_sum($nums) / count($nums), 2);
            }
        }

        return null;
    }

    private function toFloat(mixed $value): ?float
    {
        if ($value === null || $value === '' || ! is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }

    private function lower(string $value): string
    {
        return mb_strtolower(trim($value));
    }

    private function clampScore(float $value, float $min, float $max): float
    {
        return round(max($min, min($max, $value)), 2);
    }

    private function bound(float $value): float
    {
        $bounds = $this->config['bounds'];

        return round(max((float) $bounds['min'], min((float) $bounds['max'], $value)), 1);
    }
}
