<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Models\SocialPost;
use App\Models\SocialPostAsset;
use App\Models\SocialPublishLog;
use App\Services\Social\SocialContextService;
use App\Services\Social\SocialDraftGeneratorService;
use App\Services\Social\SocialImageAssetService;
use App\Services\Social\SocialManualPublisherService;
use App\Services\Social\SocialOAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSocialController extends Controller
{
    public function __construct(
        private SocialContextService $context,
        private SocialDraftGeneratorService $generator,
        private SocialImageAssetService $images,
        private SocialOAuthService $oauth,
        private SocialManualPublisherService $publisher,
    ) {}

    public function context(Request $request): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $this->context->build()]);
    }

    public function automationSettings(\App\Services\Social\SocialAutopilotService $autopilot): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $autopilot->settings()]);
    }

    public function updateAutomationSettings(Request $request, \App\Services\Social\SocialAutopilotService $autopilot): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'auto_approve_low_risk' => ['sometimes', 'boolean'],
            'auto_publish_low_risk' => ['sometimes', 'boolean'],
            'generate_images' => ['sometimes', 'boolean'],
            'posts_per_day' => ['sometimes', 'integer', 'min:1', 'max:6'],
            'platforms' => ['sometimes', 'array', 'min:1'],
            'platforms.*' => [Rule::in(['instagram', 'facebook', 'linkedin', 'google_business'])],
            'publish_hours' => ['sometimes', 'array', 'min:1', 'max:6'],
            'publish_hours.*' => ['integer', 'min:0', 'max:23'],
        ]);

        $settings = $autopilot->settings();
        $settings->update($data);

        return response()->json(['status' => 'ok', 'message' => 'Social autopilot policy updated.', 'data' => $settings->fresh()]);
    }

    public function runAutopilot(\App\Services\Social\SocialAutopilotService $autopilot): JsonResponse
    {
        $summary = $autopilot->run();

        return response()->json(['status' => 'ok', 'message' => 'Autopilot cycle completed. Low-risk posts were auto-approved and scheduled; everything else waits for review.', 'summary' => $summary]);
    }

    public function generate(Request $request): JsonResponse
    {
        $autoPlan = $request->boolean('auto_plan');

        $data = $request->validate([
            'platforms' => ['required', 'array', 'min:1'],
            'platforms.*' => ['required', Rule::in(['instagram', 'facebook', 'linkedin', 'whatsapp', 'google_business'])],
            'content_pillar' => [$autoPlan ? 'nullable' : 'required', 'string', 'max:120'],
            'objective' => [$autoPlan ? 'nullable' : 'required', 'string', 'max:400'],
            'target_audience' => [$autoPlan ? 'nullable' : 'required', 'string', 'max:140'],
            'society_id' => ['nullable', 'integer'],
            'property_id' => ['nullable', 'integer'],
            'sector' => ['nullable', 'string', 'max:120'],
            'number_of_variations' => ['required', 'integer', 'min:1', 'max:10'],
            'generate_images' => ['nullable', 'boolean'],
            'image_style' => ['nullable', Rule::in(['premium_real_estate', 'clean_corporate', 'instagram_carousel', 'whatsapp_status', 'google_business', 'minimal_vector', 'local_area_guide'])],
        ]);

        // Auto-plan: fill pillar/objective/audience/subject from the autopilot's weekday
        // content calendar + least-recently-featured rotation, so a manual run needs zero
        // creative input while still landing on a fresh, logical subject.
        if ($autoPlan) {
            $plan = app(\App\Services\Social\SocialAutopilotService::class)->planFor(now(config('app.timezone', 'UTC')));
            $data['content_pillar'] = $data['content_pillar'] ?: $plan['content_pillar'];
            $data['objective'] = $data['objective'] ?: $plan['objective'];
            $data['target_audience'] = $data['target_audience'] ?: $plan['target_audience'];
            $data['image_style'] = $data['image_style'] ?? $plan['image_style'];
            $data['society_id'] = $data['society_id'] ?? ($plan['society_id'] ?? null);
            $data['sector'] = $data['sector'] ?? ($plan['sector'] ?? null);
        }

        try {
            $result = $this->generator->generate($data + ['generate_images' => (bool) ($data['generate_images'] ?? false)]);

            return response()->json([
                'status' => 'ok',
                'message' => 'AI social drafts saved for admin review. Nothing was published.',
                'data' => ['posts' => $result['posts']],
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function posts(Request $request): JsonResponse
    {
        $query = SocialPost::query()->with('assets');
        foreach (['status', 'platform', 'risk_level'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        return response()->json(['status' => 'ok', 'data' => $query->latest()->paginate(min($request->integer('per_page', 50), 100))]);
    }

    public function showPost(SocialPost $post): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $post->load('assets')]);
    }

    public function updatePost(Request $request, SocialPost $post): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'hook' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'caption' => ['sometimes', 'required', 'string', 'max:12000'],
            'cta' => ['sometimes', 'nullable', 'string', 'max:255'],
            'hashtags' => ['sometimes', 'nullable', 'array'],
            'hashtags.*' => ['string', 'max:80'],
            'creative_prompt' => ['sometimes', 'nullable', 'string', 'max:12000'],
            'image_prompt' => ['sometimes', 'nullable', 'string', 'max:12000'],
            'image_style' => ['sometimes', 'nullable', Rule::in(['premium_real_estate', 'clean_corporate', 'instagram_carousel', 'whatsapp_status', 'google_business', 'minimal_vector', 'local_area_guide'])],
            'carousel_slides' => ['sometimes', 'nullable', 'array'],
            'reel_script' => ['sometimes', 'nullable', 'string', 'max:12000'],
            'risk_level' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'status' => ['sometimes', Rule::in(['draft', 'needs_approval', 'approved', 'rejected'])],
            'scheduled_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $post->update($data);

        return response()->json(['status' => 'ok', 'message' => 'Social draft updated. Nothing was posted.', 'data' => $post->fresh()->load('assets')]);
    }

    public function approvePost(SocialPost $post): JsonResponse
    {
        $post->update(['status' => 'approved']);

        return response()->json(['status' => 'ok', 'message' => 'Social draft approved for future manual/scheduled workflow.', 'data' => $post->fresh()->load('assets')]);
    }

    public function rejectPost(SocialPost $post): JsonResponse
    {
        $post->update(['status' => 'rejected']);

        return response()->json(['status' => 'ok', 'message' => 'Social draft rejected. Nothing was posted.', 'data' => $post->fresh()->load('assets')]);
    }

    public function publishPost(Request $request, SocialPost $post): JsonResponse
    {
        $data = $request->validate([
            'confirm_publish' => ['accepted'],
            'confirm_high_risk' => ['sometimes', 'boolean'],
            'social_account_id' => ['sometimes', 'nullable', 'integer', 'exists:social_accounts,id'],
        ]);

        try {
            $result = $this->publisher->publish($post, $data, $request->header('X-Admin-Email') ?: 'admin');

            return response()->json([
                'status' => 'ok',
                'message' => $result['mode'] === 'manual_export'
                    ? 'WhatsApp manual export prepared. Nothing was auto-posted.'
                    : 'Social post manually published.',
                'data' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function generateImage(SocialPost $post): JsonResponse
    {
        $asset = $this->images->createForPost($post);

        return response()->json(['status' => 'ok', 'message' => 'Image asset or creative brief generated for review. Nothing was published.', 'data' => $asset], 201);
    }

    public function assets(Request $request): JsonResponse
    {
        $query = SocialPostAsset::query()->with('post:id,platform,post_type,title,hook,status,risk_level');
        foreach (['status', 'platform', 'risk_level', 'asset_type'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        return response()->json(['status' => 'ok', 'data' => $query->latest()->paginate(min($request->integer('per_page', 50), 100))]);
    }

    public function updateAsset(Request $request, SocialPostAsset $asset): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['needs_approval', 'approved', 'rejected'])],
            'image_prompt' => ['sometimes', 'nullable', 'string', 'max:12000'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ]);
        $asset->update($data);

        return response()->json(['status' => 'ok', 'message' => 'Social asset updated. Nothing was posted.', 'data' => $asset->fresh()->load('post:id,title,platform,status')]);
    }

    public function approveAsset(SocialPostAsset $asset): JsonResponse
    {
        $asset->update(['status' => 'approved']);

        return response()->json(['status' => 'ok', 'message' => 'Social asset approved for future workflow.', 'data' => $asset->fresh()]);
    }

    public function rejectAsset(SocialPostAsset $asset): JsonResponse
    {
        $asset->update(['status' => 'rejected']);

        return response()->json(['status' => 'ok', 'message' => 'Social asset rejected.', 'data' => $asset->fresh()]);
    }

    public function accounts(): JsonResponse
    {
        $this->oauth->ensureAccounts();

        $accounts = SocialAccount::query()
            ->select(['id', 'platform', 'account_name', 'account_handle', 'account_id', 'status', 'token_expires_at', 'last_connected_at', 'last_error', 'scopes', 'metadata', 'created_at', 'updated_at'])
            ->orderBy('id')
            ->get()
            ->map(function (SocialAccount $account) {
                $account->last_error = $this->safeSocialAccountError($account->last_error);
                $metadata = $account->metadata ?: [];
                if (isset($metadata['locations_last_error'])) {
                    $metadata['locations_last_error'] = $this->safeSocialAccountError((string) $metadata['locations_last_error']);
                    $account->metadata = $metadata;
                }

                return $account;
            });

        return response()->json(['status' => 'ok', 'data' => $accounts]);
    }

    private function safeSocialAccountError(?string $message): ?string
    {
        if (! $message) {
            return $message;
        }

        $lower = strtolower($message);
        if (str_contains($lower, 'quota exceeded') || str_contains($lower, 'requests per minute')) {
            return \App\Services\Social\SocialOAuthService::GBP_QUOTA_MESSAGE;
        }

        return $message;
    }

    public function startOAuth(Request $request, string $platform): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['sometimes', Rule::in(['connect', 'publish'])],
        ]);

        try {
            return response()->json(['status' => 'ok', 'data' => $this->oauth->start($platform, $data['mode'] ?? 'connect')]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function oauthCallback(Request $request): JsonResponse
    {
        $data = $request->validate([
            'platform' => ['nullable', Rule::in(array_keys(SocialOAuthService::PLATFORMS))],
            'code' => ['required', 'string'],
            'state' => ['required', 'string'],
        ]);

        try {
            $account = $this->oauth->callback($data['platform'] ?? null, $data['code'], $data['state']);

            return response()->json([
                'status' => 'ok',
                'message' => 'Social account connected. Tokens are encrypted and never returned to the frontend.',
                'data' => $account->only(['id', 'platform', 'account_name', 'account_handle', 'account_id', 'status', 'token_expires_at', 'last_connected_at', 'scopes', 'metadata']),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function selectMetaPage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'page_id' => ['required', 'string'],
        ]);

        try {
            $account = $this->oauth->selectMetaPage($data['page_id']);

            return response()->json([
                'status' => 'ok',
                'message' => 'Facebook Page selected. Tokens remain encrypted and are never returned to the frontend.',
                'data' => $account->only(['id', 'platform', 'account_name', 'account_handle', 'account_id', 'status', 'token_expires_at', 'last_connected_at', 'scopes', 'metadata']),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function debugMetaPages(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $this->oauth->debugMetaPages(),
        ]);
    }

    public function metaPublishReviewUrl(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $this->oauth->metaPublishReviewUrl(),
        ]);
    }

    public function selectMetaGraphPage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'page_id' => ['required', 'string'],
            'page_name' => ['nullable', 'string', 'max:255'],
            'manual_fallback_confirmed' => ['sometimes', 'boolean'],
            'manual_confirm' => ['sometimes', 'boolean'],
            'allow_manual_fallback' => ['sometimes', 'boolean'],
            'instagram_id' => ['nullable', 'string', 'max:255'],
            'instagram_handle' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $manualFallbackConfirmed = $request->boolean('manual_fallback_confirmed')
                || $request->boolean('manual_confirm')
                || $request->boolean('allow_manual_fallback');

            $hasInstagramAsset = filled($data['instagram_id'] ?? null) || filled($data['instagram_handle'] ?? null);
            if ($hasInstagramAsset && ! $manualFallbackConfirmed) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Manual Instagram asset save requires explicit manual confirmation.',
                ], 422);
            }

            if ($hasInstagramAsset && (blank($data['instagram_id'] ?? null) || blank($data['instagram_handle'] ?? null))) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Manual Instagram asset save requires both Instagram ID and Instagram handle.',
                ], 422);
            }

            $account = $this->oauth->selectMetaPageFromGraph(
                $data['page_id'],
                $data['page_name'] ?? null,
                $manualFallbackConfirmed,
                $data['instagram_id'] ?? null,
                $data['instagram_handle'] ?? null,
            );

            return response()->json([
                'status' => 'ok',
                'message' => 'Facebook Page connected from Meta Page access. Tokens remain encrypted and are never returned to the frontend.',
                'data' => $account->only(['id', 'platform', 'account_name', 'account_handle', 'account_id', 'status', 'token_expires_at', 'last_connected_at', 'scopes', 'metadata']),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function googleBusinessLocations(): JsonResponse
    {
        try {
            return response()->json([
                'status' => 'ok',
                'data' => $this->oauth->googleBusinessLocations(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function selectGoogleBusinessLocation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'location_name' => ['required', 'string', 'max:2048'],
            'location_title' => ['nullable', 'string', 'max:255'],
            'manual_fallback_confirmed' => ['sometimes', 'boolean'],
        ]);

        try {
            $account = $this->oauth->selectGoogleBusinessLocation(
                $data['location_name'],
                $data['location_title'] ?? null,
                (bool) ($data['manual_fallback_confirmed'] ?? false),
            );

            return response()->json([
                'status' => 'ok',
                'message' => 'Google Business Profile location selected. Tokens remain encrypted and are never returned to the frontend.',
                'data' => $account->only(['id', 'platform', 'account_name', 'account_handle', 'account_id', 'status', 'token_expires_at', 'last_connected_at', 'scopes', 'metadata']),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function publishLogs(Request $request): JsonResponse
    {
        $query = SocialPublishLog::query()->latest();
        if ($request->filled('post_id')) {
            $query->where('social_post_id', $request->integer('post_id'));
        }

        return response()->json(['status' => 'ok', 'data' => $query->paginate(min($request->integer('per_page', 50), 100))]);
    }
}
