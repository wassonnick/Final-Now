<?php

namespace App\Services\Social;

use App\Models\Lead;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Support\Collection;

class SocialContextService
{
    private const SITE_URL = 'https://www.societyflats.com';

    public function build(?int $societyId = null, ?int $propertyId = null, ?string $sector = null): array
    {
        $societies = $this->publishedSocieties($societyId, $sector);
        $properties = $this->publishedProperties($propertyId, $sector);

        return [
            'brand' => [
                'name' => 'SocietyFlats.com',
                'positioning' => 'Gurgaon-first, society-first real estate discovery platform helping users choose the right society before choosing the home.',
                'tone' => 'premium, trustworthy, local expert, helpful, clear, non-spammy, practical, not hype-heavy.',
                'content_goals' => [
                    'educate users about Gurgaon societies',
                    'generate tenant/buyer/owner enquiries',
                    'explain society-first search',
                    'promote verified society intelligence',
                    'build trust for rentals and resale',
                    'encourage WhatsApp/callback enquiries',
                ],
            ],
            'published_societies_summary' => $societies->map(fn (Society $society) => $this->societySummary($society))->values(),
            'published_properties_summary' => $properties->map(fn (Property $property) => $this->propertySummary($property))->values(),
            'safe_lead_trend_summary' => $this->safeLeadTrends(),
            'popular_sectors' => $this->popularSectors(),
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
            'name' => $society->name,
            'slug' => $society->slug,
            'sector' => $society->sector,
            'locality' => $society->locality,
            'city' => $society->city,
            'builder' => $society->builder,
            'status' => $society->status,
            'published_status' => $society->is_published ? 'published' : 'not_published',
            'short_description' => $this->shorten($society->description),
            'approved_amenities' => array_values(array_filter((array) $society->amenities)),
            'nearby_highlights' => $this->nearbyHighlights($society),
            'public_url' => self::SITE_URL.'/society/'.$society->slug,
            'seo_title' => $society->meta_title,
            'seo_description' => $this->shorten($society->meta_description, 220),
        ];
    }

    private function propertySummary(Property $property): array
    {
        $society = $property->relationLoaded('society') ? $property->getRelation('society') : $property->society()->first();

        return [
            'id' => $property->id,
            'title' => $property->title,
            'slug' => $property->slug,
            'listing_type' => $property->listing_type,
            'rent_or_sale_price' => $property->price,
            'bedrooms' => $property->bedrooms,
            'society_name' => $society?->name ?: $property->getAttribute('society'),
            'sector' => $society?->sector ?: $property->locality,
            'public_url' => self::SITE_URL.'/property/'.$property->slug,
            'status' => $property->status,
        ];
    }

    private function nearbyHighlights(Society $society): array
    {
        return collect([
            $this->firstLine($society->nearby_schools),
            $this->firstLine($society->nearby_metro),
            $this->firstLine($society->nearby_hospitals),
            $this->firstLine($society->nearby_office_hubs),
        ])->filter()->values()->all();
    }

    private function safeLeadTrends(): array
    {
        $week = now()->subDays(7);
        $recent = Lead::query()->where('created_at', '>=', $week);

        return [
            'top_requested_sectors' => $this->groupLeadField('entity_slug', $week),
            'top_budget_ranges' => $this->groupLeadField('budget', $week),
            'top_property_types' => $this->groupLeadField('requirement', $week),
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
            'Do not invent prices.',
            'Do not invent availability.',
            'Do not invent builder claims.',
            'Do not invent RERA details.',
            'Do not invent possession status.',
            'Do not invent rankings.',
            'Do not invent testimonials.',
            'Do not promise guaranteed rental returns.',
            'Do not claim “best”, “number one”, “guaranteed”, or “lowest price” unless explicitly present in approved data.',
            'Any post mentioning price, availability, builder, possession, RERA, investment, market movement, returns, or ranking must be high risk and needs approval.',
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
        return trim(preg_replace('/[^a-zA-Z0-9 ₹,._\\-\\/]/', '', (string) $value) ?: '');
    }
}
