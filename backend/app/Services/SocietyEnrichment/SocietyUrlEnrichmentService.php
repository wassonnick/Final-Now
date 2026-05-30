<?php

namespace App\Services\SocietyEnrichment;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SocietyUrlEnrichmentService
{
    private const BLOCKED_OFFICIAL_HOSTS = [
        '99acres',
        'magicbricks',
        'housing.com',
        'nobroker',
        'squareyards',
        'commonfloor',
        'makaan',
        'proptiger',
        'youtube.',
        'facebook.',
        'instagram.',
        'pinterest.',
    ];

    /**
     * @return array{data: array<string, mixed>, warnings: string[], fields_to_verify: string[], diagnostics: array<string, mixed>}
     */
    public function fetchDraft(string $url): array
    {
        $url = trim($url);
        $this->validateUrl($url);

        $response = Http::timeout(35)
            ->withHeaders([
                'User-Agent' => 'SocietyFlats URL-first draft enricher (+https://societyflats.com)',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ])
            ->get($url);

        if (!$response->successful()) {
            throw new \RuntimeException("Official page returned HTTP {$response->status()}.");
        }

        $html = $response->body();
        $meta = $this->extractMeta($html);
        $structured = $this->structuredData($html);
        $links = $this->linksFromHtml($html, $url);
        $text = $this->pageText($html);
        $host = (string) parse_url($url, PHP_URL_HOST);

        $name = $this->projectName($meta, $structured, $text, $url);
        $builder = $this->developerName($meta, $text, $host);
        $sector = $this->firstMatch('/Sector[\s\/-]*[0-9A-Za-z]+/i', $text);
        $locality = $this->microMarket($text, $url);
        $description = $this->description($name, $builder, $sector, $locality, $meta['description'] ?? null);
        $brochureUrl = $this->bestLink($links, ['brochure', 'download brochure', '.pdf', 'e-brochure']);
        $floorPlanUrl = $this->bestLink($links, ['floor plan', 'floor-plan', 'plans', 'layout']);
        $galleryUrl = $this->bestLink($links, ['gallery', 'photos', 'media']);
        $imageReference = $this->imageReference($meta, $structured, $html, $url, $name);
        $amenities = $this->amenitiesFromText($text);
        $reraNumber = $this->reraNumber($text);

        $warnings = [
            'Fetched data is a draft. Verify RERA, map pin, rental data and image rights before publishing.',
        ];

        if ($brochureUrl) {
            $warnings[] = 'Official brochure link detected. PDF text extraction is not yet treated as verified data.';
        }

        if ($imageReference) {
            $warnings[] = 'Image reference found for admin review only. Public image stays placeholder until rights are approved.';
        }

        $fieldsToVerify = $this->fieldsToVerify([
            'rera_number' => $reraNumber,
            'sector' => $sector,
            'total_towers' => $this->totalTowers($text),
            'total_units' => $this->totalUnits($text),
            'latitude' => null,
            'longitude' => null,
            'image_rights' => null,
            'rent_range' => null,
            'maintenance_charges' => null,
            'rwa_contact' => null,
        ]);

        $sourceConfidence = 15
            + ($brochureUrl ? 10 : 0)
            + ($reraNumber ? 40 : 0)
            + ($locality ? 5 : 0);

        $draft = [
            'name' => $name,
            'slug' => Str::slug($name),
            'builder' => $builder,
            'sector' => $sector,
            'locality' => $locality,
            'city' => 'Gurugram',
            'state' => 'Haryana',
            'society_type' => 'Residential society',
            'address' => trim(implode(', ', array_filter([$sector, $locality, 'Gurugram']))),
            'description' => $description,
            'project_status' => $this->projectStatus($text),
            'configuration' => $this->configuration($text),
            'project_area' => $this->projectArea($text),
            'unit_size_range' => $this->unitSizeRange($text),
            'total_towers' => $this->totalTowers($text),
            'total_units' => $this->totalUnits($text),
            'amenities' => $amenities,
            'status' => 'Draft',
            'verification_status' => 'official_source_found_needs_admin_review',
            'is_published' => false,
            'featured' => false,
            'show_in_hero' => false,
            'search_boost' => false,
            'score' => $this->score($amenities, $locality),
            'security_score' => in_array('24x7 Security', $amenities, true) ? 8.2 : 7.3,
            'maintenance_score' => count($amenities) >= 6 ? 8.0 : 7.3,
            'connectivity_score' => $locality ? 7.8 : 7.1,
            'lifestyle_score' => count($amenities) >= 6 ? 8.1 : 7.2,
            'investment_score' => $locality ? 7.6 : 7.0,
            'meta_title' => "{$name} Gurgaon - Society Profile",
            'meta_description' => Str::limit(strip_tags($description), 160, ''),
            'faq' => '',
            'official_project_url' => $url,
            'official_developer_url' => $this->developerHomeUrl($url),
            'official_brochure_url' => $brochureUrl,
            'official_floor_plan_url' => $floorPlanUrl,
            'official_gallery_url' => $galleryUrl,
            'official_source_url' => $url,
            'official_source_status' => 'found',
            'official_source_last_checked_at' => now(),
            'official_source_notes' => 'Fetched from official/developer project URL. Needs admin verification before publishing.',
            'source_name' => $host ?: 'Official project page',
            'source_url' => $url,
            'source_confidence_score' => min(100, $sourceConfidence),
            'fields_to_verify' => implode(', ', $fieldsToVerify),
            'rera_number' => $reraNumber,
            'rera_status' => $reraNumber ? 'matched_from_official_page_needs_review' : 'needs_manual_verification',
            'rera_search_url' => $this->reraSearchUrl($name),
            'google_maps_url' => $this->googleMapsSearchUrl($name, $sector, $locality),
            'image_reference_url' => $imageReference,
            'image_url' => null,
            'cover_image' => null,
            'gallery_images' => [],
            'approved_gallery_image_urls' => [],
            'image_status' => $imageReference ? 'official_reference_found' : 'placeholder',
            'image_approved_by_admin' => false,
            'image_alt_text' => "{$name} residential society in Gurugram",
            'image_credit' => null,
            'image_license_notes' => 'Placeholder only. Do not publish third-party images until licensed, self-shot, or developer-approved.',
            'data_quality' => Str::limit('URL fetched draft | official_source_found_needs_admin_review | verify RERA, map pin, amenities, market data and image rights', 255, ''),
        ];

        return [
            'data' => $draft,
            'warnings' => $warnings,
            'fields_to_verify' => $fieldsToVerify,
            'diagnostics' => [
                'official_page_found' => true,
                'brochure_found' => (bool) $brochureUrl,
                'rera_reference_found' => (bool) $reraNumber,
                'google_maps_match_found' => false,
                'images_found_for_review' => (bool) $imageReference,
                'source_confidence_score' => $draft['source_confidence_score'],
            ],
        ];
    }

    private function validateUrl(string $url): void
    {
        if (!filter_var($url, FILTER_VALIDATE_URL) || !Str::startsWith($url, ['https://', 'http://'])) {
            throw new \InvalidArgumentException('Enter a valid official project URL.');
        }

        $host = Str::lower((string) parse_url($url, PHP_URL_HOST));

        foreach (self::BLOCKED_OFFICIAL_HOSTS as $blocked) {
            if (str_contains($host, $blocked)) {
                throw new \InvalidArgumentException('Broker/listing/social URLs cannot be used as official project sources.');
            }
        }

        if ($this->looksLikeAssetUrl($url)) {
            throw new \InvalidArgumentException('Use the official project page URL, not a direct image/PDF asset.');
        }
    }

    private function extractMeta(string $html): array
    {
        $meta = [];

        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches)) {
            $meta['title'] = html_entity_decode(trim(strip_tags($matches[1])), ENT_QUOTES | ENT_HTML5);
        }

        if (preg_match_all('/<meta\s+([^>]+)>/i', $html, $matches)) {
            foreach ($matches[1] as $attributes) {
                $key = $this->htmlAttribute($attributes, 'name') ?: $this->htmlAttribute($attributes, 'property');
                $content = $this->htmlAttribute($attributes, 'content');

                if (!$key || !$content) {
                    continue;
                }

                $key = Str::lower($key);
                $value = html_entity_decode(trim($content), ENT_QUOTES | ENT_HTML5);

                if (in_array($key, ['description', 'og:description', 'twitter:description'], true)) {
                    $meta['description'] = $value;
                } elseif (in_array($key, ['og:title', 'twitter:title'], true)) {
                    $meta['og_title'] = $value;
                } elseif (in_array($key, ['og:image', 'twitter:image', 'twitter:image:src'], true)) {
                    $meta['image'] = $value;
                }
            }
        }

        return $meta;
    }

    private function htmlAttribute(string $attributes, string $name): ?string
    {
        if (preg_match('/\b'.preg_quote($name, '/').'\s*=\s*(["\'])(.*?)\1/is', $attributes, $matches)) {
            return $matches[2];
        }

        return null;
    }

    private function pageText(string $html): string
    {
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', ' ', $html) ?? $html;
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', ' ', $html) ?? $html;

        return trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5)) ?? '');
    }

    /**
     * @return array<string, string>
     */
    private function linksFromHtml(string $html, string $baseUrl): array
    {
        $links = [];

        if (!preg_match_all('/<a\b([^>]*)>(.*?)<\/a>/is', $html, $matches, PREG_SET_ORDER)) {
            return $links;
        }

        foreach ($matches as $match) {
            $href = $this->htmlAttribute($match[1], 'href');
            $url = $this->absoluteUrl($href, $baseUrl);

            if (!$url) {
                continue;
            }

            $label = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($match[2]), ENT_QUOTES | ENT_HTML5)) ?? '');
            $links[$url] = $label;
        }

        return $links;
    }

    private function absoluteUrl(?string $url, string $baseUrl): ?string
    {
        if (!$url || Str::startsWith($url, ['#', 'mailto:', 'tel:', 'javascript:'])) {
            return null;
        }

        if (Str::startsWith($url, ['http://', 'https://'])) {
            return $url;
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

    private function structuredData(string $html): array
    {
        $data = [];

        if (!preg_match_all('/<script[^>]+type\s*=\s*(["\'])application\/ld\+json\1[^>]*>(.*?)<\/script>/is', $html, $matches)) {
            return $data;
        }

        foreach ($matches[2] as $json) {
            $decoded = json_decode(html_entity_decode(trim($json), ENT_QUOTES | ENT_HTML5), true);

            if (!is_array($decoded)) {
                continue;
            }

            $items = isset($decoded['@graph']) && is_array($decoded['@graph'])
                ? $decoded['@graph']
                : [$decoded];

            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }

                if (empty($data['name']) && !empty($item['name']) && is_string($item['name'])) {
                    $data['name'] = $item['name'];
                }

                if (empty($data['description']) && !empty($item['description']) && is_string($item['description'])) {
                    $data['description'] = $item['description'];
                }

                if (empty($data['image']) && !empty($item['image'])) {
                    $image = is_array($item['image']) ? ($item['image'][0] ?? null) : $item['image'];
                    if (is_string($image)) {
                        $data['image'] = $image;
                    }
                }
            }
        }

        return $data;
    }

    private function projectName(array $meta, array $structured, string $text, string $url): string
    {
        $title = $structured['name'] ?? $meta['og_title'] ?? $meta['title'] ?? '';
        $title = preg_replace('/\s+[-|]\s+.*$/', '', $title) ?: $title;
        $title = preg_replace('/\b(Residential|Commercial)\s+Projects?\b/i', '', $title) ?: $title;
        $title = trim($title);

        if ($title && strlen($title) <= 80) {
            return $this->cleanProjectName($title);
        }

        $path = trim((string) parse_url($url, PHP_URL_PATH), '/');
        $last = collect(explode('/', $path))->filter()->last();

        return $this->cleanProjectName(Str::headline((string) $last));
    }

    private function cleanProjectName(string $name): string
    {
        $name = preg_replace('/\b(Gurgaon|Gurugram|Sector\s*[0-9A-Za-z]+)\b/i', '', $name) ?: $name;
        $name = preg_replace('/\s+/', ' ', $name) ?: $name;

        return trim($name, " \t\n\r\0\x0B-|,.;:");
    }

    private function developerName(array $meta, string $text, string $host): ?string
    {
        $host = Str::lower($host);

        $known = [
            'adanirealty' => 'Adani Realty',
            'dlf' => 'DLF',
            'emaar' => 'Emaar India',
            'm3m' => 'M3M',
            'sobha' => 'Sobha',
            'godrejproperties' => 'Godrej Properties',
            'tulipcrimson' => 'Tulip Infratech',
            'tulipgroup' => 'Tulip Infratech',
            'tulip' => 'Tulip Infratech',
            'tatahousing' => 'Tata Housing',
            'atsgreens' => 'ATS Greens',
            'bestechgroup' => 'Bestech Group',
            'bptp' => 'BPTP',
            'ireo' => 'IREO',
        ];

        foreach ($known as $needle => $developer) {
            if (str_contains($host, $needle) || str_contains(Str::lower($text), Str::lower($developer))) {
                return $developer;
            }
        }

        if (preg_match('/(?:by|developer|promoter)\s+([A-Z][A-Za-z0-9&.\s]{2,40})/i', $text, $matches)) {
            return $this->cleanDeveloperName($matches[1]);
        }

        return null;
    }

    private function cleanDeveloperName(string $name): string
    {
        $name = preg_replace('/\b(All Rights Reserved?|Copyright|Privacy Policy|Disclaimer)\b.*$/i', '', $name) ?: $name;
        $name = preg_replace('/\s+/', ' ', $name) ?: $name;

        return trim($name, " \t\n\r\0\x0B-|,.;:");
    }

    private function firstMatch(string $pattern, string $text, int $group = 0): ?string
    {
        if (preg_match($pattern, $text, $matches)) {
            return trim(str_replace('‑', '-', (string) ($matches[$group] ?? $matches[0])));
        }

        return null;
    }

    private function microMarket(string $text, string $url): ?string
    {
        $haystack = Str::lower($text.' '.$url);

        foreach ([
            'Dwarka Expressway',
            'Golf Course Road',
            'Golf Course Extension Road',
            'Sohna Road',
            'New Gurgaon',
            'Southern Peripheral Road',
            'NH-8',
        ] as $market) {
            if (str_contains($haystack, Str::lower($market))) {
                return $market;
            }
        }

        return null;
    }

    private function description(string $name, ?string $builder, ?string $sector, ?string $locality, ?string $sourceDescription): string
    {
        $location = trim(implode(', ', array_filter([$sector, $locality, 'Gurugram'])));
        $parts = ["{$name} is a residential society".($location ? " in {$location}" : ' in Gurugram').'.'];

        if ($builder) {
            $parts[] = "The project is associated with {$builder}.";
        }

        if ($sourceDescription) {
            $parts[] = Str::limit(trim($sourceDescription), 260, '');
        }

        $parts[] = 'This SocietyFlats profile was fetched from an official/developer source and should be reviewed for RERA, map pin, amenities, market data and image rights before publishing.';

        return implode(' ', $parts);
    }

    private function bestLink(array $links, array $needles): ?string
    {
        foreach ($links as $url => $label) {
            $haystack = Str::lower($url.' '.$label);

            if ($this->looksLikeTrackingOrGenericLink($url)) {
                continue;
            }

            foreach ($needles as $needle) {
                if (str_contains($haystack, Str::lower($needle))) {
                    return $url;
                }
            }
        }

        return null;
    }

    private function imageReference(array $meta, array $structured, string $html, string $baseUrl, string $projectName): ?string
    {
        $image = $this->absoluteUrl($structured['image'] ?? ($meta['image'] ?? null), $baseUrl);

        if ($this->isUsefulImageReference($image, $projectName)) {
            return $image;
        }

        if (preg_match_all('/<img\b([^>]*)>/i', $html, $matches)) {
            foreach ($matches[1] as $attributes) {
                $src = $this->htmlAttribute($attributes, 'src')
                    ?: $this->htmlAttribute($attributes, 'data-src')
                    ?: $this->htmlAttribute($attributes, 'data-lazy-src');
                $candidate = $this->absoluteUrl($src, $baseUrl);

                if ($this->isUsefulImageReference($candidate, $projectName)) {
                    return $candidate;
                }
            }
        }

        return null;
    }

    private function isUsefulImageReference(?string $url, string $projectName): bool
    {
        if (!$url) {
            return false;
        }

        $host = Str::lower((string) parse_url($url, PHP_URL_HOST));
        $path = Str::lower((string) parse_url($url, PHP_URL_PATH));
        $query = Str::lower((string) parse_url($url, PHP_URL_QUERY));
        $haystack = Str::lower($url.' '.$projectName);

        foreach (['facebook.', 'instagram.', 'google-analytics', 'googletagmanager', 'doubleclick', 'pixel', 'analytics'] as $blocked) {
            if (str_contains($host.' '.$path.' '.$query, $blocked)) {
                return false;
            }
        }

        if (str_contains($path, '/tr') || str_contains($path, '/collect') || str_contains($query, 'pageview')) {
            return false;
        }

        if (preg_match('/[?\/](?:w|width)_([0-9]{1,3})/i', $url, $width) && (int) $width[1] < 180) {
            return false;
        }

        if (preg_match('/[?\/](?:h|height)_([0-9]{1,3})/i', $url, $height) && (int) $height[1] < 140) {
            return false;
        }

        if (!preg_match('/\.(?:jpg|jpeg|png|webp)(?:$|\?)/i', $url)) {
            return false;
        }

        $projectWords = collect(preg_split('/\s+/', Str::lower($projectName)) ?: [])
            ->map(fn ($word) => trim($word, '.,()[]{}'))
            ->filter(fn ($word) => strlen($word) > 3 && !in_array($word, ['the', 'and', 'gurgaon', 'gurugram', 'sector'], true));

        return $projectWords->contains(fn ($word) => str_contains($haystack, $word))
            || str_contains($haystack, 'project')
            || str_contains($haystack, 'residential')
            || str_contains($haystack, 'image')
            || str_contains($haystack, 'banner')
            || str_contains($haystack, 'gallery');
    }

    private function looksLikeTrackingOrGenericLink(string $url): bool
    {
        $path = Str::lower((string) parse_url($url, PHP_URL_PATH));
        $host = Str::lower((string) parse_url($url, PHP_URL_HOST));

        foreach (['facebook.', 'instagram.', 'youtube.', 'pinterest.', 'google.', 'doubleclick'] as $blocked) {
            if (str_contains($host, $blocked)) {
                return true;
            }
        }

        foreach (['/media/news', '/media/gallery', '/news', '/blog', '/press', '/career', '/contact'] as $genericPath) {
            if (str_contains($path, $genericPath)) {
                return true;
            }
        }

        return false;
    }

    private function projectStatus(string $text): ?string
    {
        $haystack = Str::lower($text);

        foreach (['completed', 'ready to move', 'ready-to-move', 'sold out', 'under construction', 'new launch'] as $status) {
            if (str_contains($haystack, $status)) {
                return Str::headline($status);
            }
        }

        return null;
    }

    private function reraNumber(string $text): ?string
    {
        $match = $this->firstMatch('/(?:RERA|HRERA)[\s:\/-]*(?:registration|regn\.?|no\.?|number)?[\s:\/-]*([A-Z0-9\/-]{6,})/i', $text, 1);

        if (!$match || !preg_match('/[0-9]/', $match)) {
            return null;
        }

        return $match;
    }

    private function configuration(string $text): ?string
    {
        if (preg_match('/([1-6](?:\s*,\s*[1-6]|\s*&\s*[1-6]|\s+and\s+[1-6])*\s*BHK(?:\s*(?:apartments?|homes?))?)/i', $text, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    private function projectArea(string $text): ?string
    {
        return $this->firstMatch('/([0-9.]+\s*(?:acres?|acre|hectares?))/i', $text);
    }

    private function unitSizeRange(string $text): ?string
    {
        return $this->firstMatch('/([0-9,]{3,5}\s*(?:-|to)\s*[0-9,]{3,5}\s*(?:sq\.?\s*ft|sqft|sq\.?\s*yd))/i', $text);
    }

    private function totalTowers(string $text): ?string
    {
        return $this->firstMatch('/([0-9]+)\s+(?:residential\s+)?(?:towers?|blocks?)/i', $text, 1);
    }

    private function totalUnits(string $text): ?string
    {
        $value = $this->firstMatch('/([0-9,]+)\s+(?:apartments?|units?|homes?)/i', $text, 1);

        return $value ? str_replace(',', '', $value) : null;
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
            'visitor parking' => 'Visitor Parking',
            'pet friendly' => 'Pet Friendly',
            'security' => '24x7 Security',
            'concierge' => 'Concierge',
            'cctv' => 'CCTV',
            'landscape' => 'Landscaped Greens',
            'green' => 'Landscaped Greens',
            'senior citizen' => 'Senior Citizen Area',
        ];

        $haystack = Str::lower($text);
        $amenities = [];

        foreach ($map as $needle => $amenity) {
            if (str_contains($haystack, $needle)) {
                $amenities[] = $amenity;
            }
        }

        return array_values(array_unique($amenities));
    }

    private function score(array $amenities, ?string $locality): float
    {
        $score = 7.0 + min(count($amenities), 10) * 0.12;

        if ($locality) {
            $score += 0.35;
        }

        return round(max(7.0, min(8.8, $score)), 1);
    }

    /**
     * @param array<string, mixed> $fields
     * @return string[]
     */
    private function fieldsToVerify(array $fields): array
    {
        $labels = [
            'rera_number' => 'RERA registration',
            'sector' => 'exact sector/address',
            'total_towers' => 'tower count',
            'total_units' => 'total units',
            'latitude' => 'map pin',
            'longitude' => 'map pin',
            'image_rights' => 'image rights',
            'rent_range' => 'rental range',
            'maintenance_charges' => 'maintenance charges',
            'rwa_contact' => 'RWA contact',
        ];

        $missing = [];

        foreach ($fields as $field => $value) {
            if (!$value && isset($labels[$field])) {
                $missing[] = $labels[$field];
            }
        }

        return array_values(array_unique($missing));
    }

    private function developerHomeUrl(string $url): ?string
    {
        $scheme = parse_url($url, PHP_URL_SCHEME) ?: 'https';
        $host = parse_url($url, PHP_URL_HOST);

        return $host ? "{$scheme}://{$host}" : null;
    }

    private function reraSearchUrl(string $name): string
    {
        return 'https://haryanarera.gov.in/admincontrol/registered_projects/2?search='.rawurlencode($name);
    }

    private function googleMapsSearchUrl(string $name, ?string $sector, ?string $locality): string
    {
        return 'https://www.google.com/maps/search/?api=1&query='.rawurlencode(trim(implode(' ', array_filter([$name, $sector, $locality, 'Gurugram']))));
    }

    private function looksLikeAssetUrl(string $url): bool
    {
        $path = Str::lower((string) parse_url($url, PHP_URL_PATH));

        return (bool) preg_match('/\.(?:jpg|jpeg|png|webp|gif|svg|pdf|zip|docx?|xlsx?)$/i', $path);
    }
}
