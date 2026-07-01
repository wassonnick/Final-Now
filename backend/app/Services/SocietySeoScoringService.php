<?php

namespace App\Services;

use App\Models\SocietySeoContent;

class SocietySeoScoringService
{
    public function score(SocietySeoContent|array $content): array
    {
        $value = fn (string $key) => $content instanceof SocietySeoContent ? $content->{$key} : ($content[$key] ?? null);
        $points = [
            'metadata' => $this->allText([$value('seo_title'), $value('seo_description')]) ? 10 : 0,
            'heading_intro' => $this->allText([$value('seo_h1'), $value('intro_summary')]) ? 10 : 0,
            'about' => $this->hasText($value('about_content')) ? 15 : 0,
            'location' => $this->hasText($value('location_content')) ? 15 : 0,
            'rent' => $this->hasText($value('rent_content')) ? 10 : 0,
            'sale' => $this->hasText($value('sale_content')) ? 10 : 0,
            'amenities' => $this->hasText($value('amenities_content')) ? 10 : 0,
            'faqs' => count((array) $value('faq_json')) >= 5 ? 10 : 0,
            'internal_links' => count((array) $value('internal_link_suggestions_json')) > 0 ? 5 : 0,
            'schema' => count((array) $value('schema_json')) > 0 ? 5 : 0,
        ];

        $score = array_sum($points);

        return [
            'score' => $score,
            'label' => $this->label($score),
            'breakdown' => $points,
        ];
    }

    public function update(SocietySeoContent $content): array
    {
        $result = $this->score($content);
        $content->forceFill(['content_score' => $result['score']])->save();

        return $result;
    }

    public function label(int $score): string
    {
        return match (true) {
            $score <= 40 => 'Weak',
            $score <= 60 => 'Basic',
            $score <= 80 => 'Good',
            default => 'SEO Ready',
        };
    }

    private function hasText(mixed $value): bool
    {
        return is_string($value) && trim($value) !== '';
    }

    private function allText(array $values): bool
    {
        return collect($values)->every(fn ($value) => $this->hasText($value));
    }
}
