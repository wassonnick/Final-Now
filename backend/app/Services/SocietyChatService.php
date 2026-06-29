<?php

namespace App\Services;

use App\Models\AiConversation;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SocietyChatService
{
    public function reply(AiConversation $conversation, string $message): array
    {
        $context = $this->groundingContext($message);
        if ($context['entities'] === []) {
            return ['reply' => 'SocietyFlats currently has no published society or live-property inventory to recommend. I can still help you frame a Gurgaon requirement, but I will not invent listings. Try telling me your budget, BHK, preferred sector and whether you want to rent or buy.', 'entities' => [], 'provider' => 'safe_fallback'];
        }
        $key = trim((string) config('services.gemini.api_key'));
        if ($key === '') {
            return ['reply' => 'I found published SocietyFlats data relevant to your question, but conversational AI is temporarily unavailable. Please open the verified matches below or use the AI Advisor for a rules-based shortlist.', 'entities' => $context['entities'], 'provider' => 'safe_fallback'];
        }

        $model = trim((string) config('services.gemini.model', 'gemini-2.0-flash')) ?: 'gemini-2.0-flash';
        $history = $conversation->messages()->latest()->limit(10)->get()->reverse()->map(fn ($item) => ['role' => $item->role === 'assistant' ? 'model' : 'user', 'parts' => [['text' => $item->content]]])->values()->all();
        $history[] = ['role' => 'user', 'parts' => [['text' => $message."\n\nVERIFIED SOCIETYFLATS CONTEXT:\n".$context['text']]]];
        try {
            $response = Http::timeout(25)->withHeaders(['x-goog-api-key' => $key, 'Content-Type' => 'application/json'])
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                    'systemInstruction' => ['parts' => [['text' => 'You are the SocietyFlats Gurgaon housing assistant. Use only the VERIFIED SOCIETYFLATS CONTEXT for claims about specific societies, homes, prices, availability, amenities, coordinates or ratings. Never mention draft/private data. Clearly say when evidence is unavailable. Do not provide legal, financial or safety guarantees. Keep answers concise and suggest relevant published links from the supplied entities.']]],
                    'contents' => $history,
                    'generationConfig' => ['temperature' => 0.2, 'maxOutputTokens' => 700],
                ]);
            $text = trim((string) data_get($response->json(), 'candidates.0.content.parts.0.text'));
            if (! $response->successful() || $text === '') {
                throw new \RuntimeException('Provider response unavailable.');
            }

            return ['reply' => $text, 'entities' => $context['entities'], 'provider' => 'gemini', 'model' => $model];
        } catch (\Throwable $exception) {
            Log::warning('Society chat provider failed', ['conversation_id' => $conversation->id, 'message' => $exception->getMessage()]);

            return ['reply' => 'I could not complete the conversational response just now. The verified matches below are still safe to browse; no private or draft inventory has been used.', 'entities' => $context['entities'], 'provider' => 'safe_fallback'];
        }
    }

    private function groundingContext(string $message): array
    {
        $tokens = collect(preg_split('/\s+/', Str::lower(preg_replace('/[^a-z0-9\s]/i', ' ', $message))) ?: [])->filter(fn ($token) => strlen($token) >= 3)->reject(fn ($token) => in_array($token, ['the', 'and', 'for', 'with', 'rent', 'buy', 'flat', 'home', 'society', 'gurgaon', 'gurugram'], true))->take(6)->values();
        $societies = Society::query()->where('is_published', true)->whereIn('status', ['Verified', 'Premium'])
            ->when($tokens->isNotEmpty(), fn ($query) => $query->where(function ($q) use ($tokens) {
                foreach ($tokens as $token) {
                    $pattern = '%'.$token.'%';
                    $q->orWhereRaw('LOWER(name) LIKE ?', [$pattern])->orWhereRaw('LOWER(sector) LIKE ?', [$pattern])->orWhereRaw('LOWER(locality) LIKE ?', [$pattern])->orWhereRaw('LOWER(builder) LIKE ?', [$pattern]);
                }
            }))
            ->orderByDesc('featured')->limit(8)->get();
        if ($societies->isEmpty()) {
            $societies = Society::query()->where('is_published', true)->whereIn('status', ['Verified', 'Premium'])->orderByDesc('featured')->limit(5)->get();
        }
        $properties = Property::query()->publiclyAvailable()->when($societies->isNotEmpty(), fn ($q) => $q->whereIn('society_id', $societies->pluck('id')))->limit(8)->get();
        $entities = $societies->map(fn ($s) => ['type' => 'society', 'id' => $s->id, 'name' => $s->name, 'slug' => $s->slug, 'url' => '/society/'.$s->slug])->concat($properties->map(fn ($p) => ['type' => 'property', 'id' => $p->id, 'name' => $p->title, 'slug' => $p->slug, 'url' => '/property/'.$p->slug]))->values()->all();
        $lines = $societies->map(fn ($s) => 'SOCIETY | '.implode(' | ', array_filter([$s->name, $s->builder, $s->sector, $s->locality, $s->rent_range, $s->buy_range, $s->description])))->concat($properties->map(fn ($p) => 'LIVE PROPERTY | '.implode(' | ', array_filter([$p->title, $p->listing_type, $p->price, $p->bedrooms ? $p->bedrooms.' BHK' : null, $p->locality]))));

        return ['text' => $lines->join("\n"), 'entities' => $entities];
    }
}
