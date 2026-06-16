<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpDeliveryService
{
    /**
     * @return array{
     *   attempted: bool,
     *   delivered: bool,
     *   provider: string,
     *   channel: string,
     *   message: string,
     *   error?: string|null
     * }
     */
    public function send(string $phone, string $code, string $channel = 'sms'): array
    {
        $provider = trim((string) config('services.otp.provider', 'log'));
        $enabled = (bool) config('services.otp.enabled', false);
        $channel = in_array($channel, ['sms', 'whatsapp'], true) ? $channel : 'sms';

        if (!$enabled || $provider === '' || $provider === 'log') {
            Log::info('OTP generated but external provider is not enabled', [
                'phone' => $phone,
                'channel' => $channel,
                'provider' => $provider ?: 'log',
            ]);

            return [
                'attempted' => false,
                'delivered' => false,
                'provider' => $provider ?: 'log',
                'channel' => $channel,
                'message' => 'OTP generated. Delivery provider is not connected yet.',
            ];
        }

        return match ($provider) {
            'webhook' => $this->sendViaWebhook($phone, $code, $channel),
            default => [
                'attempted' => false,
                'delivered' => false,
                'provider' => $provider,
                'channel' => $channel,
                'message' => 'OTP provider is configured but not implemented yet.',
            ],
        };
    }

    private function sendViaWebhook(string $phone, string $code, string $channel): array
    {
        $url = trim((string) config('services.otp.webhook_url', ''));
        $token = trim((string) config('services.otp.webhook_token', ''));

        if ($url === '') {
            return [
                'attempted' => false,
                'delivered' => false,
                'provider' => 'webhook',
                'channel' => $channel,
                'message' => 'OTP webhook URL is missing.',
            ];
        }

        $headers = [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];

        if ($token !== '') {
            $headers['Authorization'] = 'Bearer ' . $token;
            $headers['X-Webhook-Token'] = $token;
        }

        try {
            Http::timeout(8)
                ->retry(1, 300)
                ->withHeaders($headers)
                ->post($url, [
                    'event' => 'account_otp',
                    'phone' => $phone,
                    'otp' => $code,
                    'channel' => $channel,
                    'message' => "Your SocietyFlats OTP is {$code}. It expires in 10 minutes.",
                ])
                ->throw();

            return [
                'attempted' => true,
                'delivered' => true,
                'provider' => 'webhook',
                'channel' => $channel,
                'message' => 'OTP sent successfully.',
            ];
        } catch (\Throwable $exception) {
            Log::warning('OTP webhook delivery failed', [
                'phone' => $phone,
                'channel' => $channel,
                'message' => $exception->getMessage(),
            ]);

            return [
                'attempted' => true,
                'delivered' => false,
                'provider' => 'webhook',
                'channel' => $channel,
                'message' => 'OTP delivery failed. Please use fallback for now.',
                'error' => $exception->getMessage(),
            ];
        }
    }
}
