<?php

namespace App\Services\VerifiedSocietyImporter;

use App\Models\Society;

class SocietyImportDuplicateMatcher
{
    public function __construct(private SocietyImportNormalizer $normalizer) {}

    public function match(array $data): array
    {
        if (! empty($data['rera_number']) && ($society = Society::where('rera_number', $data['rera_number'])->first())) return $this->result($society,100,'Exact RERA number');
        if (! empty($data['google_place_id']) && ($society = Society::where('place_id', $data['google_place_id'])->first())) return $this->result($society,95,'Exact Google Place ID');
        if (! empty($data['slug']) && ($society = Society::where('slug', $data['slug'])->first())) return $this->result($society,92,'Exact slug');

        $candidates = Society::query()->where('city', $data['city'] ?? 'Gurugram')->limit(300)->get();
        foreach ($candidates as $society) {
            $sameName = $this->normalizer->normalizedName($society->name) === ($data['normalized_name'] ?? '');
            if ($sameName && ! empty($data['sector']) && strcasecmp((string) $society->sector, (string) $data['sector']) === 0) return $this->result($society,90,'Normalized name and sector');
            if ($sameName && ! empty($data['builder_name']) && strcasecmp((string) $society->builder, (string) $data['builder_name']) === 0) return $this->result($society,80,'Name and builder');
            similar_text($this->normalizer->normalizedName($society->name), (string) ($data['normalized_name'] ?? ''), $percent);
            if ($percent >= 88) return $this->result($society,70,'Similar name in same city');
        }
        return ['duplicate_score'=>0,'matched_society_id'=>null,'match_reason'=>null,'recommended_action'=>'create'];
    }

    private function result(Society $society, int $score, string $reason): array
    {
        return ['duplicate_score'=>$score,'matched_society_id'=>$society->id,'match_reason'=>$reason,'recommended_action'=>$score>=90?'skip':'review'];
    }
}
