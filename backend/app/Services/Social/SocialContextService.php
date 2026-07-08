<?php

namespace App\Services\Social;

use App\Models\Lead;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Support\Collection;

class SocialContextService
{
    private const SITE_URL = 'https://www.societyflats.com';

    private const BLOCKED_CONTEXT_PATTERN = '/\b(?:phone|mobile|email|password|token|admin_note|notes|lead_name|rera|possession|rating|guaranteed|best|number one|lowest|cheapest|ready\s*[- ]?\s*to\s*[- ]?\s*move|starting\s+from|google\s+rating|investment\s+return|appreciation)\b|₹|rs\.?|cr\b|crore|lac|lakh|\b\d+(?:\.\d+)?\s*(?:km|kilometres?|minutes?|mins?)\b/i';

    public function build(?int $societyId = null, ?int $propertyId = null, ?string $sector = null): array
    {
        $societies = $this->publishedSocieties($societyId, $sector);
        $properties = $this->publishedProperties($propertyId, $sector);

        return [
            'brand' => [
                'name' => 'SocietyFlats.com',
                'positioning' => 'Gurgaon local society discovery platform helping a buyer, tenant, owner and channel audience choose the right society before choosing the home.',
                'tone' => 'trustworthy, local expert, helpful, clear, non-spammy, practical, not hype-heavy.',
                'content_goals' => [
                    'educate buyer and tenant audiences about Gurgaon societies',
                    'generate tenant/buyer/owner enquiries',
                    'explain society-led search',
                    'promote verified society intelligence',
                    'build trust for rentals and resale',
                    'encourage WhatsApp/callback enquiries',
                ],
            ],
            'published_societies_summary' => $societies->map(fn (Society $society) => $this->societySummary($society))->values(),
            'published_properties_summary' => $properties->map(fn (Property $property) => $this->propertySummary($property))->values(),
            'safe_lead_trend_summary' => $this->safeLeadTrends(),
            'popular_areas' => $this->popularSectors(),
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
            'builder' => $this->sanitizeMarketingText($society->builder, 100),
            'published_status' => 'published',
            'short_description' => $this->sanitizeMarketingText($society->description),
            'approved_amenities' => $this->cleanAmenities($society->amenities),
            'nearby_highlights' => $this->nearbyHighlights($society),
            'public_url' => self::SITE_URL.'/society/'.$society->slug,
            'seo_title' => $this->sanitizeMarketingText($society->meta_title, 120),
            'seo_description' => $this->sanitizeMarketingText($society->meta_description, 180),
        ];
    }

    private function propertySummary(Property $property): array
    {
        $society = $property->relationLoaded('society') ? $property->getRelation('society') : $property->society()->first();

        return [
            'id' => $property->id,
            'title' => $this->sanitizeMarketingText($property->title, 100) ?: 'Published SocietyFlats home',
            'slug' => $property->slug,
            'listing_type' => $this->sanitizeMarketingText($property->listing_type, 40),
            'bedrooms' => $property->bedrooms,
            'society_name' => $this->sanitizeMarketingText($society?->name ?: $property->getAttribute('society'), 100),
            'sector' => $this->sanitizeMarketingText($society?->sector ?: $property->locality, 80),
            'public_url' => self::SITE_URL.'/property/'.$property->slug,
            'status' => $property->status,
        ];
    }

    private function nearbyHighlights(Society $society): array
    {
        return collect([
            ...$this->nearbyEntries($society->nearby_schools, 'school'),
            ...$this->nearbyEntries($society->nearby_metro, 'transit'),
            ...$this->nearbyEntries($society->nearby_hospitals, 'hospital'),
            ...$this->nearbyEntries($society->nearby_office_hubs, 'business'),
        ])
            ->filter(fn ($item) => $item['name'] !== '')
            ->unique(fn ($item) => mb_strtolower($item['category'].'|'.$item['name']))
            ->take(8)
            ->values()
            ->all();
    }

    private function safeLeadTrends(): array
    {
        $week = now()->subDays(7);
        $recent = Lead::query()->where('created_at', '>=', $week);

        return [
            'requested_areas' => $this->groupLeadField('entity_slug', $week),
            'requested_property_types' => $this->groupLeadField('requirement', $week),
            'tenant_enquiries_this_week' => (clone $recent)->where(fn ($q) => $q
                ->where('lead_intent', 'like', '%rent%')
                ->orWhere('requirement', 'like', '%rent%'))->count(),
            'owner_listing_enquiries_this_week' => (clone $recent)->where(fn ($q) => $q
                ->where('source', 'like', '%owner%')
                ->orWhere('source', 'like', '%sell%')
                ->orWhere('lead_intent', 'like', '%owner%'))->count(),
        ];
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

    private function popularSectors(): array
    {
        $societies = Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->whereNotNull('sector')
            ->selectRaw('sector as name, COUNT(*) as count')
            ->groupBy('sector')
            ->orderByDesc('count')
            ->limit(15)
            ->get();

        return $societies->map(fn ($row) => ['name' => $row->name, 'count' => (int) $row->count])->all();
    }

    private function claimRules(): array
    {
        return [
            'Use only the provided SocietyFlats data.',
            'Do not invent monetary figures, inventory claims, legal registry details, handover timelines, rankings, testimonials, or financial outcomes.',
            'Avoid superlatives and hard-sell language unless the exact claim is approved outside this context.',
            'Any draft with sensitive commercial, legal, builder, inventory, or market language must be treated as high risk and reviewed.',
            'Generic educational posts may be low risk.',
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
            ->map(fn ($item) => $this->sanitizeMarketingText($item, 60))
            ->filter()
            ->unique(fn ($item) => mb_strtolower($item))
            ->take(12)
            ->values()
            ->all();
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
