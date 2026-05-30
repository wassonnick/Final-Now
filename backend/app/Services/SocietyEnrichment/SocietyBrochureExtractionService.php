<?php

namespace App\Services\SocietyEnrichment;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class SocietyBrochureExtractionService
{
    private const AMENITIES = [
        'Clubhouse' => ['clubhouse', 'club house'],
        'Swimming Pool' => ['swimming pool', 'pool'],
        'Gym' => ['gymnasium', 'gym', 'fitness'],
        'Kids Play Area' => ['kids play', 'children play', 'play area'],
        'Tennis Court' => ['tennis'],
        'Badminton Court' => ['badminton'],
        'Basketball Court' => ['basketball'],
        'Jogging Track' => ['jogging', 'walking track'],
        'Power Backup' => ['power backup', '100% power'],
        'Visitor Parking' => ['visitor parking'],
        'Pet Friendly' => ['pet friendly', 'pet park'],
        '24x7 Security' => ['24x7 security', '24 x 7 security', 'security'],
        'Concierge' => ['concierge'],
        'CCTV' => ['cctv'],
        'Landscaped Greens' => ['landscaped', 'green area', 'greens', 'garden'],
        'Senior Citizen Area' => ['senior citizen'],
    ];

    /**
     * @param array<string, mixed> $context
     * @return array{data: array<string, mixed>, warnings: string[], fields_to_verify: string[], diagnostics: array<string, mixed>}
     */
    public function fetchDraft(UploadedFile $file, array $context = []): array
    {
        $rawText = $this->extractText((string) file_get_contents($file->getRealPath()));
        $text = $this->cleanText($rawText);
        $warnings = [
            'Brochure data is a draft. Verify RERA, map pin, rental data and image rights before publishing.',
        ];

        if (Str::length($text) < 120) {
            $warnings[] = 'This PDF may be scanned or image-based. Only limited text could be extracted.';
        }

        $name = $this->projectName($text, (string) ($context['name'] ?? ''));
        $builder = $this->developerName($text, (string) ($context['builder'] ?? ''));
        $sector = $this->firstMatch('/Sector[\s\/-]*[0-9A-Za-z]+/i', $text) ?: (string) ($context['sector'] ?? '');
        $locality = $this->microMarket($text, (string) ($context['locality'] ?? ''));
        $amenities = $this->amenitiesFromText($text);
        $reraNumber = $this->reraNumber($text);
        $projectStatus = $this->projectStatus($text);
        $configuration = $this->configuration($text);
        $projectArea = $this->projectArea($text);
        $unitSizeRange = $this->unitSizeRange($text);
        $totalTowers = $this->totalTowers($text);
        $totalUnits = $this->totalUnits($text);
        $fieldsToVerify = $this->fieldsToVerify([
            'RERA registration' => $reraNumber,
            'tower count' => $totalTowers,
            'total units' => $totalUnits,
            'exact sector/address' => $sector,
            'map pin' => null,
            'image rights' => null,
            'rental range' => null,
            'maintenance charges' => null,
            'RWA contact' => null,
        ]);

        $confidence = 10 + ($reraNumber ? 40 : 0) + (count($amenities) ? 5 : 0);
        $description = $this->description($name, $builder, $sector, $locality, $projectStatus, $configuration);

        $draft = [
            'name' => $name,
            'slug' => $name ? Str::slug($name) : '',
            'builder' => $builder,
            'sector' => $sector,
            'locality' => $locality,
            'city' => (string) ($context['city'] ?? 'Gurugram'),
            'state' => (string) ($context['state'] ?? 'Haryana'),
            'society_type' => (string) ($context['society_type'] ?? 'Residential society'),
            'address' => trim(implode(', ', array_filter([$sector, $locality, 'Gurugram']))),
            'description' => $description,
            'project_status' => $projectStatus,
            'configuration' => $configuration,
            'project_area' => $projectArea,
            'unit_size_range' => $unitSizeRange,
            'total_towers' => $totalTowers,
            'total_units' => $totalUnits,
            'amenities' => $amenities,
            'status' => 'Draft',
            'verification_status' => 'brochure_uploaded_needs_admin_review',
            'is_published' => false,
            'score' => count($amenities) >= 8 ? 8.0 : (count($amenities) >= 4 ? 7.6 : 7.1),
            'security_score' => in_array('24x7 Security', $amenities, true) ? 8.1 : 7.2,
            'maintenance_score' => count($amenities) >= 6 ? 7.9 : 7.2,
            'connectivity_score' => $locality ? 7.8 : 7.1,
            'lifestyle_score' => count($amenities) >= 6 ? 8.0 : 7.2,
            'investment_score' => $locality ? 7.5 : 7.0,
            'meta_title' => $name ? "{$name} Gurgaon - Society Profile" : '',
            'meta_description' => $description ? Str::limit(strip_tags($description), 160, '') : '',
            'faq' => '',
            'brochure_name' => $file->getClientOriginalName(),
            'rera_number' => $reraNumber,
            'rera_status' => $reraNumber ? 'matched_from_brochure_needs_review' : 'needs_manual_verification',
            'source_name' => 'Uploaded brochure PDF',
            'official_source_status' => 'needs_manual_review',
            'official_source_last_checked_at' => now(),
            'official_source_notes' => 'Draft fields extracted from uploaded brochure PDF. Needs admin verification before publishing.',
            'fields_to_verify' => implode(', ', $fieldsToVerify),
            'source_confidence_score' => min(100, $confidence),
            'data_quality' => Str::limit('Brochure uploaded draft | needs_admin_review | verify RERA, map pin, market data and image rights', 255, ''),
        ];

        return [
            'data' => $draft,
            'warnings' => $warnings,
            'fields_to_verify' => $fieldsToVerify,
            'diagnostics' => [
                'brochure_text_found' => Str::length($text) >= 120,
                'characters_extracted' => Str::length($text),
                'rera_reference_found' => (bool) $reraNumber,
                'amenities_found' => count($amenities),
                'source_confidence_score' => $draft['source_confidence_score'],
            ],
        ];
    }

    private function extractText(string $pdf): string
    {
        $chunks = [$pdf];

        if (preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $pdf, $matches)) {
            foreach ($matches[1] as $stream) {
                $chunks[] = $stream;
                $decoded = @gzuncompress(ltrim($stream));
                if (is_string($decoded)) {
                    $chunks[] = $decoded;
                }
            }
        }

        $text = '';

        foreach ($chunks as $chunk) {
            if (preg_match_all('/\((?:\\\\.|[^\\\\()])*\)\s*Tj/s', $chunk, $matches)) {
                foreach ($matches[0] as $match) {
                    $text .= ' '.$this->decodePdfLiteral($match);
                }
            }

            if (preg_match_all('/\[(.*?)\]\s*TJ/s', $chunk, $matches)) {
                foreach ($matches[1] as $array) {
                    if (preg_match_all('/\((?:\\\\.|[^\\\\()])*\)/s', $array, $strings)) {
                        foreach ($strings[0] as $literal) {
                            $text .= ' '.$this->decodePdfLiteral($literal);
                        }
                    }
                }
            }

            if (preg_match_all('/<([0-9A-Fa-f]{6,})>\s*Tj/s', $chunk, $matches)) {
                foreach ($matches[1] as $hex) {
                    $decoded = @hex2bin($hex);
                    if (is_string($decoded)) {
                        $text .= ' '.$decoded;
                    }
                }
            }
        }

        return $text;
    }

    private function decodePdfLiteral(string $literal): string
    {
        $literal = preg_replace('/\s*Tj$/', '', trim($literal)) ?? $literal;
        $literal = trim($literal, '()');
        $literal = preg_replace_callback('/\\\\([0-7]{1,3})/', fn ($m) => chr(octdec($m[1])), $literal) ?? $literal;

        return strtr($literal, [
            '\\n' => "\n",
            '\\r' => "\r",
            '\\t' => "\t",
            '\\b' => '',
            '\\f' => '',
            '\\(' => '(',
            '\\)' => ')',
            '\\\\' => '\\',
        ]);
    }

    private function cleanText(string $text): string
    {
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
        $text = preg_replace('/[^\P{C}\n\r\t]+/u', ' ', $text) ?? $text;

        return trim(preg_replace('/\s+/', ' ', $text) ?? '');
    }

    private function projectName(string $text, string $fallback): string
    {
        if ($fallback) {
            return $fallback;
        }

        foreach ([
            '/(?:project|property)\s+name\s*[:\-]\s*([A-Z][A-Za-z0-9& .\'-]{3,80})/i',
            '/(?:welcome to|introducing)\s+([A-Z][A-Za-z0-9& .\'-]{3,80})/i',
        ] as $pattern) {
            $match = $this->firstMatch($pattern, $text, 1);
            if ($match) {
                return trim($match, " \t\n\r\0\x0B,.-");
            }
        }

        return '';
    }

    private function developerName(string $text, string $fallback): string
    {
        if ($fallback) {
            return $fallback;
        }

        return $this->firstMatch('/(?:developer|promoter|builder)\s*(?:name)?\s*[:\-]\s*([A-Z][A-Za-z0-9& .\'-]{3,80})/i', $text, 1) ?: '';
    }

    private function microMarket(string $text, string $fallback): string
    {
        if ($fallback) {
            return $fallback;
        }

        foreach (['Dwarka Expressway', 'Golf Course Extension Road', 'Golf Course Road', 'Sohna Road', 'MG Road', 'New Gurgaon', 'Southern Peripheral Road'] as $market) {
            if (Str::contains(Str::lower($text), Str::lower($market))) {
                return $market;
            }
        }

        return '';
    }

    private function description(string $name, string $builder, string $sector, string $locality, string $status, string $configuration): string
    {
        if (!$name) {
            return '';
        }

        $parts = array_filter([
            $name,
            $builder ? "by {$builder}" : null,
            $sector ? "in {$sector}" : null,
            $locality ? "near {$locality}" : null,
            $configuration ? "with {$configuration}" : null,
            $status ? "Project status: {$status}." : null,
        ]);

        return implode(' ', $parts).' Details were extracted from an uploaded brochure PDF and should be verified before publishing.';
    }

    private function reraNumber(string $text): string
    {
        $match = $this->firstMatch('/(?:RERA|HRERA)[\s:\/-]*(?:registration|regn\.?|no\.?|number)?[\s:\/-]*([A-Z0-9\/-]{6,})/i', $text, 1);

        if (!$match || !preg_match('/[0-9]/', $match)) {
            return '';
        }

        return $match;
    }

    private function projectStatus(string $text): string
    {
        $lower = Str::lower($text);
        foreach (['ready to move', 'completed', 'under construction', 'new launch', 'sold out', 'possession'] as $status) {
            if (str_contains($lower, $status)) {
                return Str::title($status);
            }
        }

        return '';
    }

    private function configuration(string $text): string
    {
        if (preg_match('/((?:[1-6](?:\s*,\s*|\s*&\s*|\s+and\s+)?)+)\s*BHK/i', $text, $matches)) {
            return trim($matches[1]).' BHK Apartments';
        }

        return '';
    }

    private function projectArea(string $text): string
    {
        return $this->firstMatch('/([0-9]+(?:\.[0-9]+)?\s*(?:acres?|acre|hectares?))/i', $text) ?: '';
    }

    private function unitSizeRange(string $text): string
    {
        return $this->firstMatch('/([0-9,]{3,5}\s*(?:-|to)\s*[0-9,]{3,5}\s*(?:sq\.?\s*ft\.?|sqft|sq\.?\s*yds?))/i', $text) ?: '';
    }

    private function totalTowers(string $text): string
    {
        return $this->firstMatch('/([0-9]{1,3})\s+(?:towers?|blocks?)/i', $text, 1) ?: '';
    }

    private function totalUnits(string $text): string
    {
        return $this->firstMatch('/([0-9,]{2,5})\s+(?:units?|apartments?|homes?)/i', $text, 1) ?: '';
    }

    /**
     * @return string[]
     */
    private function amenitiesFromText(string $text): array
    {
        $lower = Str::lower($text);
        $amenities = [];

        foreach (self::AMENITIES as $amenity => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($lower, $needle)) {
                    $amenities[] = $amenity;
                    break;
                }
            }
        }

        return array_values(array_unique($amenities));
    }

    /**
     * @param array<string, mixed> $values
     * @return string[]
     */
    private function fieldsToVerify(array $values): array
    {
        return array_keys(array_filter($values, fn ($value) => blank($value)));
    }

    private function firstMatch(string $pattern, string $text, int $group = 0): ?string
    {
        if (preg_match($pattern, $text, $matches)) {
            return trim($matches[$group] ?? '');
        }

        return null;
    }
}
