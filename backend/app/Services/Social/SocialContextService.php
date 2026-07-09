<?php

namespace App\Services\Social;

use App\Models\Lead;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Support\Collection;

class SocialContextService
{
    private const SITE_URL = 'https://www.societyflats.com';

    private const BLOCKED_CONTEXT_PATTERN = '/phone|mobile|email|password|token|admin_note|notes|lead_name|owner_phone|owner_email|₹|rs\.|cr\b|crore|lac|lakh|rera|possession|ready to move|ready-to-move|rating|google rating|guaranteed|best|number one|lowest|cheapest|investment|return|appreciation|luxury|ultra-luxury|premium|world-class|exclusive|limited|book now|sq\.ft|sqft|sq m|acre|km|minutes|preferred time|tomorrow|today|raw message|requirement|\bbhk\b|\btowers?\b|\bunits?\b/i';

    private const SAFE_LEAD_BUCKETS = [
        'rent',
        'buy',
        'resale',
        'owner_listing',
        'tenant_query',
        'buyer_query',
        'general',
        'unknown',
    ];

    private const SAFE_AMENITY_KEYWORDS = [
        'swimming pool' => 'Swimming Pool',
        'gymnasium' => 'Gymnasium',
        'gym' => 'Gymnasium',
        'clubhouse' => 'Clubhouse',
        'kids play area' => 'Kids Play Area',
        'children play area' => 'Kids Play Area',
        'jogging track' => 'Jogging Track',
        'security' => 'Security',
        '24x7 security' => 'Security',
        'cctv' => 'CCTV',
        'power backup' => 'Power Backup',
        'visitor parking' => 'Parking',
        'parking' => 'Parking',
        'garden' => 'Garden',
        'park' => 'Park',
        'tennis court' => 'Tennis Court',
        'basketball court' => 'Basketball Court',
        'badminton court' => 'Badminton Court',
        'yoga area' => 'Yoga Area',
        'meditation area' => 'Meditation Area',
        'indoor games' => 'Indoor Games',
        'community hall' => 'Community Hall',
        'multipurpose hall' => 'Multipurpose Hall',
        'lift' => 'Lift',
        'water supply' => 'Water Supply',
        'fire safety' => 'Fire Safety',
        'rainwater harvesting' => 'Rainwater Harvesting',
        'ev charging' => 'EV Charging',
    ];

    public function build(?int $societyId = null, ?int $propertyId = null, ?string $sector = null): array
    {
        $societies = $this->publishedSocieties($societyId, $sector);
        $properties = $this->publishedProperties($propertyId, $sector);

        // Without an explicit subject the context used to open with the same societies in the
        // same order every run, so every batch of drafts anchored on the same names. Rotate:
        // least-recently-featured societies first (random tie-break), trimmed to a focused set.
        if ($societyId === null && $sector === null && $societies->count() > 1) {
            $lastFeatured = \App\Models\SocialPost::query()
                ->where('source_type', 'society')->whereNotNull('source_id')
                ->selectRaw('source_id, MAX(created_at) as last_used')->groupBy('source_id')
                ->pluck('last_used', 'source_id');
            $societies = $societies
                ->shuffle()
                ->sortBy(fn (Society $society) => (string) ($lastFeatured[$society->id] ?? '1970-01-01'))
                ->take(14)
                ->values();
        }

        return [
            'brand' => [
                'name' => 'SocietyFlats.com',
                'positioning' => 'Gurgaon society discovery platform for safe social draft ideas.',
                'tone' => 'trustworthy, local, helpful, clear, practical.',
                'content_goals' => [
                    'educate home search audiences about Gurgaon societies',
                    'encourage enquiry through SocietyFlats',
                    'explain society-led home search',
                    'keep every draft review-led',
                ],
            ],
            'published_societies_summary' => $societies->map(fn (Society $society) => $this->societySummary($society))->values(),
            'published_properties_summary' => $properties->map(fn (Property $property) => $this->propertySummary($property))->values(),
            'safe_lead_trend_summary' => $this->safeLeadTrends(),
            'safe_claim_rules' => $this->claimRules(),
        ];
    }

    public function publishedSociety(int $id): ?Society
    {
        return Society::query()
            ->whereKey($id)
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->first();
    }

    public function publishedProperty(int $id): ?Property
    {
        return Property::query()->with('society')->publiclyAvailable()->whereKey($id)->first();
    }

    private function publishedSocieties(?int $societyId, ?string $sector): Collection
    {
        return Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->when($societyId, fn ($q) => $q->whereKey($societyId))
            ->when($sector, fn ($q) => $q->where(fn ($inner) => $inner
                ->where('sector', 'like', '%'.$sector.'%')
                ->orWhere('locality', 'like', '%'.$sector.'%')))
            ->latest('published_at')
            ->limit(80)
            ->get();
    }

    private function publishedProperties(?int $propertyId, ?string $sector): Collection
    {
        return Property::query()
            ->with('society:id,name,slug,sector,locality,status,is_published')
            ->publiclyAvailable()
            ->when($propertyId, fn ($q) => $q->whereKey($propertyId))
            ->when($sector, fn ($q) => $q->where(fn ($inner) => $inner
                ->where('locality', 'like', '%'.$sector.'%')
                ->orWhereHas('society', fn ($society) => $society
                    ->where('sector', 'like', '%'.$sector.'%')
                    ->orWhere('locality', 'like', '%'.$sector.'%'))))
            ->latest('published_at')
            ->limit(50)
            ->get();
    }

    private function societySummary(Society $society): array
    {
        return [
            'id' => $society->id,
            'name' => $this->sanitizeMarketingText($society->name, 100) ?: 'Published Gurgaon society',
            'slug' => $society->slug,
            'sector' => $this->sanitizeMarketingText($society->sector, 80),
            'locality' => $this->sanitizeMarketingText($society->locality, 80),
            'city' => $this->sanitizeMarketingText($society->city, 80),
            'builder' => $this->sanitizeBuilderName($society->builder, 100),
            'published_status' => 'published',
            'short_description' => $this->neutralSocietySummary($society),
            'approved_amenities' => $this->cleanAmenities($society->amenities),
            'nearby_highlights' => $this->nearbyHighlights($society),
            'public_url' => self::SITE_URL.'/society/'.$society->slug,
        ];
    }

    private function propertySummary(Property $property): array
    {
        $society = $property->relationLoaded('society') ? $property->getRelation('society') : $property->society()->first();
        $slug = $this->safeSlug($property->slug, 'published-home-'.$property->id);

        return [
            'id' => $property->id,
            'title' => $this->sanitizeMarketingText($property->title, 100) ?: 'Published SocietyFlats home',
            'slug' => $slug,
            'listing_type' => $this->sanitizeMarketingText($property->listing_type, 40),
            'bedrooms' => $property->bedrooms,
            'society_name' => $this->sanitizeMarketingText($society?->name ?: $property->getAttribute('society'), 100),
            'sector' => $this->sanitizeMarketingText($society?->sector ?: $property->locality, 80),
            'public_url' => self::SITE_URL.'/property/'.$slug,
            'status' => $property->status,
        ];
    }

    private function nearbyHighlights(Society $society): array
    {
        return [
            'schools' => count($this->flattenNearby($society->nearby_schools)),
            'hospitals' => count($this->flattenNearby($society->nearby_hospitals)),
            'transit' => count($this->flattenNearby($society->nearby_metro)),
            'business_hubs' => count($this->flattenNearby($society->nearby_office_hubs)),
            'other' => 0,
        ];
    }

    private function safeLeadTrends(): array
    {
        $week = now()->subDays(7);
        $recent = Lead::query()->where('created_at', '>=', $week);

        return [
            'requested_areas' => $this->groupLeadField('entity_slug', $week),
            'requested_property_types' => $this->safeLeadTypeBuckets($week),
            'tenant_queries_this_week' => (clone $recent)->where(fn ($q) => $q
                ->where('lead_intent', 'like', '%rent%')
                ->orWhere('requirement', 'like', '%rent%'))->count(),
            'owner_listing_queries_this_week' => (clone $recent)->where(fn ($q) => $q
                ->where('source', 'like', '%owner%')
                ->orWhere('source', 'like', '%sell%')
                ->orWhere('lead_intent', 'like', '%owner%'))->count(),
        ];
    }

    private function safeLeadTypeBuckets($since): array
    {
        $counts = array_fill_keys(self::SAFE_LEAD_BUCKETS, 0);

        Lead::query()
            ->where('created_at', '>=', $since)
            ->get([
                'requirement',
                'lead_intent',
                'source',
                'message',
                'search_query',
                'ai_query',
                'cta_label',
                'source_page',
            ])
            ->each(function (Lead $lead) use (&$counts) {
                $bucket = $this->safeLeadBucket($lead);
                $counts[$bucket] = ($counts[$bucket] ?? 0) + 1;
            });

        return collect($counts)
            ->filter(fn (int $count) => $count > 0)
            ->sortDesc()
            ->map(fn (int $count, string $label) => ['label' => $label, 'count' => $count])
            ->values()
            ->all();
    }

    private function safeLeadBucket(Lead $lead): string
    {
        $text = mb_strtolower(implode(' ', array_filter([
            $lead->requirement,
            $lead->lead_intent,
            $lead->source,
            $lead->message,
            $lead->search_query,
            $lead->ai_query,
            $lead->cta_label,
            $lead->source_page,
        ], fn ($value) => is_scalar($value) && trim((string) $value) !== '')));

        if ($text === '') {
            return 'unknown';
        }

        if (preg_match('/\b(?:owner|list\s*property|listing|sell(?:er|ing)?|landlord)\b/', $text)) {
            return 'owner_listing';
        }

        if (preg_match('/\b(?:resale|secondary sale|re-sale)\b/', $text)) {
            return 'resale';
        }

        if (preg_match('/\b(?:rent|rental|lease|tenant)\b/', $text)) {
            return str_contains($text, 'tenant') && ! preg_match('/\b(?:rent|rental|lease)\b/', $text)
                ? 'tenant_query'
                : 'rent';
        }

        if (preg_match('/\b(?:buy|buyer|purchase|for sale)\b/', $text)) {
            return str_contains($text, 'buyer') && ! preg_match('/\b(?:buy|purchase|for sale)\b/', $text)
                ? 'buyer_query'
                : 'buy';
        }

        if (preg_match('/\b(?:callback|contact|enquiry|inquiry|question|help|general)\b/', $text)) {
            return 'general';
        }

        return 'unknown';
    }

    private function groupLeadField(string $field, $since): array
    {
        return Lead::query()
            ->where('created_at', '>=', $since)
            ->whereNotNull($field)
            ->selectRaw($field.' as label, COUNT(*) as count')
            ->groupBy($field)
            ->orderByDesc('count')
            ->limit(8)
            ->get()
            ->map(fn ($row) => ['label' => $this->safeLabel($row->label), 'count' => (int) $row->count])
            ->filter(fn ($row) => $row['label'] !== '')
            ->values()
            ->all();
    }

    private function claimRules(): array
    {
        return [
            'Use only the provided SocietyFlats data.',
            'Use neutral educational copy only.',
            'Avoid commercial, legal, timing, ranking, size, availability, or market claims.',
            'Any builder mention must be treated as high risk and reviewed.',
            'In SM1A, all AI-generated posts must still be saved as needs_approval.',
        ];
    }

    private function firstLine(mixed $value): ?string
    {
        if (is_array($value)) {
            $value = collect($value)->map(fn ($item) => is_array($item) ? ($item['name'] ?? $item['title'] ?? null) : $item)->filter()->first();
        }

        $line = trim(strtok((string) $value, "\n") ?: '');

        return $line ?: null;
    }

    private function nearbyEntries(mixed $value, string $category): array
    {
        $items = $this->flattenNearby($value);

        return collect($items)
            ->map(fn ($item) => $this->nearbyEntry($item, $category))
            ->filter()
            ->values()
            ->all();
    }

    private function neutralSocietySummary(Society $society): string
    {
        $area = $this->safeAreaLabel($society->sector ?: $society->locality) ?: 'Gurgaon';
        $city = $this->safeAreaLabel($society->city) ?: 'Gurgaon';
        $builder = $this->sanitizeBuilderName($society->builder, 80);

        if ($builder) {
            return "Published society profile by {$builder} in {$area}, {$city} with approved amenities and a public SocietyFlats page.";
        }

        return "Published society profile in {$area}, {$city} with approved amenities and a public SocietyFlats page.";
    }

    private function nearbyEntry(mixed $item, string $category): ?array
    {
        $name = is_array($item)
            ? ($item['name'] ?? $item['title'] ?? $item['place_name'] ?? null)
            : $item;

        $name = $this->sanitizeNearbyName($name);
        if ($name === '') {
            return null;
        }

        return ['name' => $name, 'category' => $category];
    }

    private function flattenNearby(mixed $value): array
    {
        if (is_null($value) || $value === '') {
            return [];
        }

        if (is_array($value)) {
            return collect($value)
                ->flatMap(function ($item) {
                    if (is_string($item)) {
                        $decoded = json_decode($item, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                            return $this->flattenNearby($decoded);
                        }
                    }

                    return [$item];
                })
                ->all();
        }

        $decoded = json_decode((string) $value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $this->flattenNearby($decoded);
        }

        return preg_split('/\r?\n|,|;/', (string) $value) ?: [];
    }

    private function cleanAmenities(mixed $value): array
    {
        $items = [];

        if (is_array($value)) {
            foreach ($value as $item) {
                if (is_string($item)) {
                    $decoded = json_decode($item, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $items = array_merge($items, $this->cleanAmenities($decoded));
                        continue;
                    }
                    $items = array_merge($items, preg_split('/,|;|\r?\n/', $item) ?: []);
                    continue;
                }

                $items[] = is_array($item) ? ($item['name'] ?? $item['title'] ?? null) : $item;
            }
        } elseif (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $this->cleanAmenities($decoded);
            }

            $items = preg_split('/,|;|\r?\n/', $value) ?: [];
        }

        return collect($items)
            ->map(fn ($item) => $this->safeAmenity($item))
            ->filter()
            ->unique(fn ($item) => mb_strtolower($item))
            ->take(10)
            ->values()
            ->all();
    }

    private function safeAmenity(mixed $item): ?string
    {
        $text = trim((string) $item);
        if ($text === '' || is_numeric($text) || preg_match('/[\[\]{}]/', $text) || preg_match(self::BLOCKED_CONTEXT_PATTERN, $text)) {
            return null;
        }

        $normalized = mb_strtolower(preg_replace('/\s+/', ' ', $text) ?: $text);

        foreach (self::SAFE_AMENITY_KEYWORDS as $needle => $label) {
            if ($normalized === $needle || str_contains($normalized, $needle)) {
                return $label;
            }
        }

        return null;
    }

    private function sanitizeNearbyName(mixed $value): string
    {
        $value = $this->sanitizeMarketingText($value, 80);
        if (! $value) {
            return '';
        }

        $value = preg_replace('/\b(?:near|nearby|from|away|approx\.?|approximately)\b.*$/i', '', $value) ?: $value;
        $value = preg_replace('/\s*[-–—|]\s*$/', '', $value) ?: $value;
        $value = trim($value, " \t\n\r\0\x0B-–—|,.");

        if (mb_strlen($value) < 3 || ! preg_match('/[a-zA-Z]/', $value)) {
            return '';
        }

        return $value;
    }

    private function sanitizeMarketingText(mixed $value, int $limit = 240): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        $value = preg_replace('/<cite\b[^>]*>.*?<\/cite>/is', ' ', $value) ?: $value;
        $value = strip_tags($value);
        $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $value = preg_replace('/\[[^\]]*cite[^\]]*\]|\bturn\d+\w*\d*\b/i', ' ', $value) ?: $value;

        $value = collect(preg_split('/(?<=[.!?])\s+|\r?\n/', $value) ?: [])
            ->map(fn ($sentence) => trim($sentence))
            ->reject(fn ($sentence) => $sentence === '' || preg_match(self::BLOCKED_CONTEXT_PATTERN, $sentence))
            ->implode(' ');

        if ($value === '') {
            return null;
        }
        $value = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', ' ', $value) ?: $value;
        $value = preg_replace('/(?:\+?\d[\d\s().-]{7,}\d)/', ' ', $value) ?: $value;
        $value = preg_replace('/₹\s*[\d,.]+(?:\s*(?:cr|crore|lac|lakh|k))?|\brs\.?\s*[\d,.]+(?:\s*(?:cr|crore|lac|lakh|k))?|\b[\d,.]+\s*(?:cr|crore|lac|lakh)\b/i', ' ', $value) ?: $value;
        $value = preg_replace('/\bRERA\b[^.,;\n]*/i', ' ', $value) ?: $value;
        $value = preg_replace('/\bpossession\b[^.,;\n]*/i', ' ', $value) ?: $value;
        $value = preg_replace('/\bready\s*[- ]?\s*to\s*[- ]?\s*move\b[^.,;\n]*/i', ' ', $value) ?: $value;
        $value = preg_replace('/\bstarting\s+from\b[^.,;\n]*/i', ' ', $value) ?: $value;
        $value = preg_replace('/\b(?:google\s+)?rating\b[^.,;\n]*/i', ' ', $value) ?: $value;
        $value = preg_replace('/\b\d+(?:\.\d+)?\s*(?:km|kilometres?|minutes?|mins?)\b/i', ' ', $value) ?: $value;
        $value = preg_replace('/\b(?:best|top|number\s+one|guaranteed|lowest|cheapest|investment\s+return|appreciation)\b[^.,;\n]*/i', ' ', $value) ?: $value;
        $value = preg_replace('/[^\p{L}\p{N}\s.,&()\/-]/u', ' ', $value) ?: $value;
        $value = preg_replace('/\s+/', ' ', $value) ?: $value;
        $value = trim($value, " \t\n\r\0\x0B.,;-");

        if ($value === '' || preg_match(self::BLOCKED_CONTEXT_PATTERN, $value)) {
            return null;
        }

        return $this->shorten($value, $limit);
    }

    private function sanitizeBuilderName(mixed $value, int $limit = 100): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        $value = preg_replace('/<cite\b[^>]*>.*?<\/cite>/is', ' ', $value) ?: $value;
        $value = strip_tags($value);
        $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $value = preg_replace('/\[[^\]]*cite[^\]]*\]|\bturn\d+\w*\d*\b/i', ' ', $value) ?: $value;
        $value = preg_replace('/\b(?:private\s+limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llp)\b\.?/i', ' ', $value) ?: $value;
        $value = preg_replace('/[^\p{L}\p{N}\s.&()\/-]/u', ' ', $value) ?: $value;
        $value = preg_replace('/\s+/', ' ', $value) ?: $value;
        $value = trim($value, " \t\n\r\0\x0B.,;-&");

        if ($value === '' || preg_match(self::BLOCKED_CONTEXT_PATTERN, $value)) {
            return null;
        }

        return $this->shorten($value, $limit);
    }

    private function safeAreaLabel(mixed $value): ?string
    {
        return $this->sanitizeMarketingText($value, 80);
    }

    private function safeSlug(?string $slug, string $fallback): string
    {
        $slug = trim((string) $slug);
        if ($slug === '' || preg_match(self::BLOCKED_CONTEXT_PATTERN, str_replace('-', ' ', $slug))) {
            return $fallback;
        }

        return $slug;
    }

    private function shorten(?string $value, int $limit = 280): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        return mb_strlen($value) > $limit ? mb_substr($value, 0, $limit - 1).'…' : $value;
    }

    private function safeLabel(mixed $value): string
    {
        return $this->sanitizeMarketingText($value, 80) ?: '';
    }
}
