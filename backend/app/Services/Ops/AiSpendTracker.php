<?php

namespace App\Services\Ops;

use App\Models\AiUsageLog;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiSpendTracker
{
    public function recordAnthropicText(string $feature, string $operation, string $model, mixed $response, array $context = []): ?AiUsageLog
    {
        $usage = $this->objectToArray($response->usage ?? null);
        $input = (int) ($usage['input_tokens'] ?? $usage['inputTokens'] ?? 0);
        $output = (int) ($usage['output_tokens'] ?? $usage['outputTokens'] ?? 0);

        return $this->record([
            'provider' => 'anthropic',
            'feature' => $feature,
            'operation' => $operation,
            'model' => $model,
            'status' => 'succeeded',
            'input_tokens' => $input,
            'output_tokens' => $output,
            'total_tokens' => $input + $output,
            'estimated_cost_usd' => $this->estimateTextCost('anthropic', $model, $input, $output),
        ], $context);
    }

    public function recordOpenAiText(string $feature, string $operation, string $model, array $payload, array $context = []): ?AiUsageLog
    {
        $usage = (array) ($payload['usage'] ?? []);
        $input = (int) ($usage['prompt_tokens'] ?? $usage['input_tokens'] ?? 0);
        $output = (int) ($usage['completion_tokens'] ?? $usage['output_tokens'] ?? 0);
        $total = (int) ($usage['total_tokens'] ?? ($input + $output));

        return $this->record([
            'provider' => 'openai',
            'feature' => $feature,
            'operation' => $operation,
            'model' => $model,
            'status' => 'succeeded',
            'input_tokens' => $input,
            'output_tokens' => $output,
            'total_tokens' => $total,
            'estimated_cost_usd' => $this->estimateTextCost('openai', $model, $input, $output),
        ], $context);
    }

    public function recordOpenAiImage(string $feature, string $operation, string $model, string $quality, string $size, int $count = 1, array $context = []): ?AiUsageLog
    {
        $cost = $this->estimateImageCost($quality, $count);

        return $this->record([
            'provider' => 'openai',
            'feature' => $feature,
            'operation' => $operation,
            'model' => $model,
            'status' => 'succeeded',
            'image_count' => max(1, $count),
            'estimated_cost_usd' => $cost,
            'metadata' => ['quality' => $quality, 'size' => $size],
        ], $context);
    }

    public function recordFailure(string $provider, string $feature, string $operation, ?string $model, Throwable $e, array $context = []): ?AiUsageLog
    {
        return $this->record([
            'provider' => $provider,
            'feature' => $feature,
            'operation' => $operation,
            'model' => $model,
            'status' => 'failed',
            'billable' => false,
            'error_class' => $e::class,
            'error_message' => mb_substr($e->getMessage(), 0, 500),
        ], $context);
    }

    public function summary(int $days = 30): array
    {
        $days = max(1, min(365, $days));
        $from = now()->subDays($days - 1)->startOfDay();
        $base = AiUsageLog::query()->where('created_at', '>=', $from);

        $totals = (clone $base)
            ->selectRaw('COUNT(*) as calls, COALESCE(SUM(estimated_cost_usd),0) as cost, COALESCE(SUM(total_tokens),0) as tokens, COALESCE(SUM(image_count),0) as images, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as failures', ['failed'])
            ->first();

        $budgetGuard = app(AiBudgetGuard::class);

        return [
            'days' => $days,
            'estimated_cost_usd' => round((float) ($totals->cost ?? 0), 6),
            'calls' => (int) ($totals->calls ?? 0),
            'total_tokens' => (int) ($totals->tokens ?? 0),
            'image_count' => (int) ($totals->images ?? 0),
            'failures' => (int) ($totals->failures ?? 0),
            'today_estimated_cost_usd' => round((float) AiUsageLog::where('created_at', '>=', now()->startOfDay())->sum('estimated_cost_usd'), 6),
            'last_7_days_estimated_cost_usd' => round((float) AiUsageLog::where('created_at', '>=', now()->subDays(6)->startOfDay())->sum('estimated_cost_usd'), 6),
            'by_provider' => $this->grouped(clone $base, 'provider'),
            'by_feature' => $this->grouped(clone $base, 'feature'),
            'by_model' => $this->grouped(clone $base, 'model'),
            'budget_guard' => [
                'used_today' => $budgetGuard->used(),
                'daily_cap' => $budgetGuard->cap(),
                'provider_limited' => $budgetGuard->providerLimited(),
            ],
        ];
    }

    public function recent(int $limit = 50): Collection
    {
        return AiUsageLog::query()
            ->latest('created_at')
            ->limit(max(1, min(100, $limit)))
            ->get();
    }

    private function record(array $attributes, array $context = []): ?AiUsageLog
    {
        if (! (bool) config('services.ai_spend.enabled', true)) {
            return null;
        }

        try {
            $metadata = array_merge(
                (array) ($attributes['metadata'] ?? []),
                (array) ($context['metadata'] ?? []),
            );
            unset($attributes['metadata'], $context['metadata']);

            return AiUsageLog::create(array_merge([
                'operation' => null,
                'model' => null,
                'status' => 'succeeded',
                'input_tokens' => 0,
                'output_tokens' => 0,
                'total_tokens' => 0,
                'image_count' => 0,
                'estimated_cost_usd' => 0,
                'currency' => 'USD',
                'billable' => true,
                'subject_type' => $context['subject_type'] ?? null,
                'subject_id' => $context['subject_id'] ?? null,
                'request_id' => request()?->headers->get('X-Request-Id'),
                'metadata' => $metadata ?: null,
            ], $attributes));
        } catch (Throwable $e) {
            Log::warning('AI spend tracking failed', ['error' => $e->getMessage()]);

            return null;
        }
    }

    private function estimateTextCost(string $provider, string $model, int $input, int $output): float
    {
        $key = strtolower($provider.':'.$model);
        $rates = $this->textRates($key);

        return round(($input * $rates['input']) + ($output * $rates['output']), 6);
    }

    private function textRates(string $key): array
    {
        if (str_contains($key, 'sonnet')) {
            return ['input' => (float) config('services.ai_spend.claude_sonnet_input_usd_per_token', 0.000003), 'output' => (float) config('services.ai_spend.claude_sonnet_output_usd_per_token', 0.000015)];
        }
        if (str_contains($key, 'haiku')) {
            return ['input' => (float) config('services.ai_spend.claude_haiku_input_usd_per_token', 0.0000008), 'output' => (float) config('services.ai_spend.claude_haiku_output_usd_per_token', 0.000004)];
        }
        if (str_contains($key, 'gpt') && str_contains($key, 'mini')) {
            return ['input' => (float) config('services.ai_spend.openai_mini_input_usd_per_token', 0.00000015), 'output' => (float) config('services.ai_spend.openai_mini_output_usd_per_token', 0.0000006)];
        }

        return ['input' => (float) config('services.ai_spend.default_input_usd_per_token', 0.000001), 'output' => (float) config('services.ai_spend.default_output_usd_per_token', 0.000003)];
    }

    private function estimateImageCost(string $quality, int $count): float
    {
        $quality = strtolower($quality ?: 'high');
        $unit = match ($quality) {
            'low' => (float) config('services.ai_spend.openai_image_low_usd', 0.02),
            'medium' => (float) config('services.ai_spend.openai_image_medium_usd', 0.07),
            default => (float) config('services.ai_spend.openai_image_high_usd', 0.17),
        };

        return round($unit * max(1, $count), 6);
    }

    private function grouped($query, string $field): array
    {
        return $query
            ->selectRaw("COALESCE({$field}, 'unknown') as label, COUNT(*) as calls, COALESCE(SUM(estimated_cost_usd),0) as cost, COALESCE(SUM(total_tokens),0) as tokens, COALESCE(SUM(image_count),0) as images")
            ->groupByRaw("COALESCE({$field}, 'unknown')")
            ->orderByDesc('cost')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->label,
                'calls' => (int) $row->calls,
                'estimated_cost_usd' => round((float) $row->cost, 6),
                'total_tokens' => (int) $row->tokens,
                'image_count' => (int) $row->images,
            ])
            ->values()
            ->all();
    }

    private function objectToArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_object($value)) {
            return json_decode(json_encode($value), true) ?: [];
        }

        return [];
    }
}
