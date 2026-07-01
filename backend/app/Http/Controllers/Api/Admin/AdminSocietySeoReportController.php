<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Models\SocietySeoContent;
use App\Services\SocietySeoAiDraftService;
use App\Services\SocietySeoScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSocietySeoReportController extends Controller
{
    public function __construct(
        private readonly SocietySeoScoringService $scoring,
        private readonly SocietySeoAiDraftService $ai,
    ) {
    }

    public function report(Request $request): JsonResponse
    {
        $societies = Society::with('seoContent')->orderBy('name')->get();
        $items = $societies->map(fn (Society $society) => $this->item($society))->values();

        return response()->json([
            'status' => 'ok',
            'summary' => [
                'total_societies' => $societies->count(),
                'published' => $items->where('seo_status', 'published')->count(),
                'draft' => $items->where('seo_status', 'draft')->count(),
                'needs_review' => $items->where('seo_status', 'needs_review')->count(),
                'approved' => $items->where('seo_status', 'approved')->count(),
                'unpublished' => $items->where('seo_status', 'unpublished')->count(),
                'no_seo_content' => $items->where('seo_status', 'missing')->count(),
                'weak' => $items->where('score_label', 'Weak')->count(),
                'basic' => $items->where('score_label', 'Basic')->count(),
                'good' => $items->where('score_label', 'Good')->count(),
                'seo_ready' => $items->where('score_label', 'SEO Ready')->count(),
                'average_content_score' => round((float) $items->avg('content_score'), 1),
                'missing_builder' => $societies->filter(fn ($society) => empty($society->builder))->count(),
                'missing_location' => $societies->filter(fn ($society) => empty($society->sector) && empty($society->locality))->count(),
                'missing_amenities' => $societies->filter(fn ($society) => empty($society->amenities))->count(),
                'missing_rent_content' => $items->filter(fn ($item) => in_array('Rent content', $item['missing_sections'], true))->count(),
                'missing_sale_content' => $items->filter(fn ($item) => in_array('Sale content', $item['missing_sections'], true))->count(),
                'missing_faqs' => $items->filter(fn ($item) => in_array('FAQs', $item['missing_sections'], true))->count(),
            ],
            'data' => $items,
        ]);
    }

    public function bulkScore(Request $request): JsonResponse
    {
        $limit = min(max($request->integer('limit', 50), 1), 100);
        $offset = max($request->integer('offset', 0), 0);
        $societies = Society::with('seoContent')->orderBy('id')->offset($offset)->limit($limit)->get();
        $summary = ['checked' => $societies->count(), 'scored' => 0, 'skipped' => 0, 'failed' => 0, 'items' => []];

        foreach ($societies as $society) {
            if (! $society->seoContent) { $summary['skipped']++; continue; }
            try {
                $result = $this->scoring->update($society->seoContent);
                $summary['scored']++;
                $summary['items'][] = ['society_id' => $society->id, 'score' => $result['score'], 'label' => $result['label']];
            } catch (\Throwable $exception) {
                $summary['failed']++;
                $summary['items'][] = ['society_id' => $society->id, 'error' => $exception->getMessage()];
            }
        }

        return response()->json(['status' => 'ok', 'message' => 'SEO scoring batch completed.', 'summary' => $summary]);
    }

    public function bulkGenerate(Request $request): JsonResponse
    {
        return $this->generateBatch($request, false);
    }

    public function bulkRegenerateMissing(Request $request): JsonResponse
    {
        return $this->generateBatch($request, true);
    }

    private function generateBatch(Request $request, bool $regenerateWeak): JsonResponse
    {
        $limit = min(max($request->integer('limit', 10), 1), 20);
        $offset = max($request->integer('offset', 0), 0);
        $includeDrafts = $request->boolean('include_drafts') || $regenerateWeak;
        $societies = Society::with('seoContent')->orderBy('id')->offset($offset)->limit($limit)->get();
        $summary = ['total' => $societies->count(), 'already_published' => 0, 'drafts_generated' => 0, 'skipped' => 0, 'failed' => 0, 'items' => []];

        foreach ($societies as $society) {
            $existing = $society->seoContent;
            if ($existing?->status === 'published') { $summary['already_published']++; continue; }
            if ($existing && ! $includeDrafts) { $summary['skipped']++; continue; }
            if ($regenerateWeak && $existing && $existing->content_score > 60) { $summary['skipped']++; continue; }

            try {
                $result = $this->ai->generate($society, $regenerateWeak ? 'regenerate missing or weak sections' : 'generate', $existing?->only(SocietySeoAiDraftService::OUTPUT_KEYS) ?: []);
                $content = $society->seoContent()->firstOrNew();
                $content->fill($result['content']);
                $content->status = 'needs_review';
                $content->generated_by = 'ai';
                $content->reviewed_by = null;
                $content->published_at = null;
                $content->save();
                $score = $this->scoring->update($content);
                $summary['drafts_generated']++;
                $summary['items'][] = ['society_id' => $society->id, 'name' => $society->name, 'score' => $score['score'], 'warnings' => $result['warnings']];
            } catch (\Throwable $exception) {
                report($exception);
                $summary['failed']++;
                $summary['items'][] = ['society_id' => $society->id, 'name' => $society->name, 'error' => 'SEO draft generation failed for this society.'];
            }
        }

        return response()->json(['status' => 'ok', 'message' => 'SEO draft batch completed. No content was published.', 'summary' => $summary]);
    }

    private function item(Society $society): array
    {
        $content = $society->seoContent;
        $missing = array_values(array_filter([
            ! $content?->seo_title || ! $content?->seo_description ? 'Metadata' : null,
            ! $content?->intro_summary ? 'Intro' : null,
            ! $content?->about_content ? 'About' : null,
            ! $content?->location_content ? 'Location content' : null,
            ! $content?->rent_content ? 'Rent content' : null,
            ! $content?->sale_content ? 'Sale content' : null,
            ! $content?->amenities_content ? 'Amenities content' : null,
            count((array) $content?->faq_json) < 5 ? 'FAQs' : null,
        ]));
        $score = (int) ($content?->content_score ?? 0);

        return [
            'society_id' => $society->id,
            'society' => $society->name,
            'slug' => $society->slug,
            'location' => $society->sector ?: ($society->locality ?: 'Missing'),
            'builder' => $society->builder ?: 'Missing',
            'seo_status' => $content?->status ?? 'missing',
            'content_score' => $score,
            'score_label' => $this->scoring->label($score),
            'missing_sections' => $missing,
            'updated_at' => $content?->updated_at?->toISOString(),
        ];
    }
}
