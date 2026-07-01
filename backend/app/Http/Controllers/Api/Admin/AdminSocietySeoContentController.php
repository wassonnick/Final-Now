<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Models\SocietySeoContent;
use App\Services\SocietySeoScoringService;
use App\Services\SocietySeoAiDraftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSocietySeoContentController extends Controller
{
    public function __construct(
        private readonly SocietySeoScoringService $scoring,
        private readonly SocietySeoAiDraftService $ai,
    )
    {
    }

    public function show(Society $society): JsonResponse
    {
        $content = $society->seoContent;

        return response()->json([
            'status' => 'ok',
            'data' => $content ? $this->payload($content) : $this->emptyPayload($society),
        ]);
    }

    public function store(Request $request, Society $society): JsonResponse
    {
        return $this->save($request, $society, true);
    }

    public function update(Request $request, Society $society): JsonResponse
    {
        return $this->save($request, $society, false);
    }

    public function score(Society $society): JsonResponse
    {
        $content = $society->seoContent()->firstOrCreate([], [
            'status' => 'draft',
            'generated_by' => 'manual',
        ]);
        $score = $this->scoring->update($content);

        return response()->json(['status' => 'ok', 'data' => $this->payload($content->fresh()), 'score' => $score]);
    }

    public function approve(Request $request, Society $society): JsonResponse
    {
        $content = $society->seoContent()->firstOrFail();
        $content->update([
            'status' => 'approved',
            'reviewed_by' => $request->user()?->getAuthIdentifier(),
        ]);

        return response()->json(['status' => 'ok', 'message' => 'SEO content approved. It is not public until published.', 'data' => $this->payload($content->fresh())]);
    }

    public function publish(Request $request, Society $society): JsonResponse
    {
        $content = $society->seoContent()->firstOrFail();

        if (! in_array($content->status, ['approved', 'unpublished', 'published'], true)) {
            return response()->json(['status' => 'error', 'message' => 'Approve SEO content before publishing it.'], 422);
        }

        $content->update([
            'status' => 'published',
            'reviewed_by' => $content->reviewed_by ?: $request->user()?->getAuthIdentifier(),
            'published_at' => now(),
        ]);

        return response()->json(['status' => 'ok', 'message' => 'SEO content published.', 'data' => $this->payload($content->fresh())]);
    }

    public function unpublish(Society $society): JsonResponse
    {
        $content = $society->seoContent()->firstOrFail();
        $content->update(['status' => 'unpublished', 'published_at' => null]);

        return response()->json(['status' => 'ok', 'message' => 'SEO content removed from the public society page.', 'data' => $this->payload($content->fresh())]);
    }

    public function preview(Society $society): JsonResponse
    {
        $content = $society->seoContent()->firstOrFail();

        return response()->json([
            'status' => 'ok',
            'data' => $this->payload($content),
            'publicly_visible' => $content->status === 'published',
            'warning' => $content->status === 'published' ? null : 'Preview only. This SEO content is not public.',
        ]);
    }

    public function generateAiDraft(Request $request, Society $society): JsonResponse
    {
        return $this->generateWithAi($request, $society, 'generate');
    }

    public function improveAiDraft(Request $request, Society $society): JsonResponse
    {
        return $this->generateWithAi($request, $society, 'improve');
    }

    private function save(Request $request, Society $society, bool $creating): JsonResponse
    {
        $data = $this->validated($request);
        $content = $society->seoContent()->firstOrNew();
        $wasGenerated = $content->exists && in_array($content->generated_by, ['ai', 'system'], true);
        $content->fill($data);
        $content->status = in_array($content->status, ['published', 'approved'], true) ? 'needs_review' : ($content->status ?: 'draft');
        $content->generated_by = $wasGenerated ? 'ai_plus_admin' : ($content->generated_by ?: 'manual');
        $content->published_at = null;
        $content->save();
        $score = $this->scoring->update($content);

        return response()->json([
            'status' => 'ok',
            'message' => 'SEO draft saved. It is not public until published.',
            'data' => $this->payload($content->fresh()),
            'score' => $score,
        ], $creating && $content->wasRecentlyCreated ? 201 : 200);
    }

    private function generateWithAi(Request $request, Society $society, string $mode): JsonResponse
    {
        $content = $society->seoContent;
        if ($content?->status === 'published') {
            return response()->json(['status' => 'error', 'message' => 'Published SEO content was not overwritten. Unpublish it explicitly before creating a replacement draft.'], 409);
        }
        if ($content && ! $request->boolean('confirm_replace')) {
            return response()->json(['status' => 'error', 'message' => 'Confirm replacement before regenerating the existing SEO draft.'], 409);
        }

        try {
            $result = $this->ai->generate($society, $mode, $content?->only(SocietySeoAiDraftService::OUTPUT_KEYS) ?: []);
        } catch (\Throwable $exception) {
            return response()->json(['status' => 'error', 'message' => $exception->getMessage(), 'warnings' => $this->ai->missingFacts($society)], 422);
        }

        $content = $society->seoContent()->firstOrNew();
        $content->fill($result['content']);
        $content->status = 'needs_review';
        $content->generated_by = 'ai';
        $content->reviewed_by = null;
        $content->published_at = null;
        $content->save();
        $score = $this->scoring->update($content);

        return response()->json([
            'status' => 'ok',
            'message' => 'AI SEO draft generated for admin review. Nothing was published.',
            'data' => $this->payload($content->fresh()),
            'warnings' => $result['warnings'],
            'provider' => $result['provider'],
            'score' => $score,
        ]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'seo_title' => 'nullable|string|max:255',
            'seo_description' => 'nullable|string|max:500',
            'seo_h1' => 'nullable|string|max:255',
            'intro_summary' => 'nullable|string',
            'about_content' => 'nullable|string',
            'location_content' => 'nullable|string',
            'rent_content' => 'nullable|string',
            'sale_content' => 'nullable|string',
            'amenities_content' => 'nullable|string',
            'investment_content' => 'nullable|string',
            'pros_json' => 'nullable|array',
            'pros_json.*' => 'string|max:500',
            'cons_json' => 'nullable|array',
            'cons_json.*' => 'string|max:500',
            'best_for_json' => 'nullable|array',
            'best_for_json.*' => 'string|max:255',
            'nearby_highlights_json' => 'nullable|array',
            'nearby_highlights_json.*' => 'string|max:500',
            'faq_json' => 'nullable|array',
            'faq_json.*.question' => 'required_with:faq_json|string|max:500',
            'faq_json.*.answer' => 'required_with:faq_json|string|max:3000',
            'internal_link_suggestions_json' => 'nullable|array',
            'internal_link_suggestions_json.*' => [function (string $attribute, mixed $value, \Closure $fail) {
                if (! is_string($value) && ! is_array($value)) $fail("{$attribute} must be a string or object.");
            }],
            'schema_json' => 'nullable|array',
            'keyword_score' => 'nullable|integer|min:0|max:100',
            'uniqueness_score' => 'nullable|integer|min:0|max:100',
            'readability_score' => 'nullable|integer|min:0|max:100',
            'status' => ['nullable', Rule::in(['draft', 'needs_review', 'approved', 'published', 'unpublished'])],
            'generated_by' => ['nullable', Rule::in(SocietySeoContent::GENERATORS)],
        ]);
    }

    private function payload(SocietySeoContent $content): array
    {
        return array_merge($content->toArray(), ['score_label' => $this->scoring->label($content->content_score)]);
    }

    private function emptyPayload(Society $society): array
    {
        return array_merge((new SocietySeoContent(['society_id' => $society->id, 'status' => 'draft', 'generated_by' => 'manual']))->toArray(), [
            'id' => null,
            'content_score' => 0,
            'keyword_score' => 0,
            'uniqueness_score' => 0,
            'readability_score' => 0,
            'score_label' => 'Weak',
        ]);
    }
}
