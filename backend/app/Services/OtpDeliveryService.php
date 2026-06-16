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
     *   error?: string|null,
     *   provider_response?: mixed
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
            'msg91' => $this->sendViaMsg91($phone, $code, $channel),
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

    private function sendViaMsg91(string $phone, string $code, string $channel): array
    {
        if ($channel !== 'sms') {
            return [
                'attempted' => false,
                'delivered' => false,
                'provider' => 'msg91',
                'channel' => $channel,
                'message' => 'MSG91 OTP provider currently supports SMS channel only.',
            ];
        }

        $authkey = trim((string) config('services.otp.msg91_authkey', ''));
        $templateId = trim((string) config('services.otp.msg91_template_id', ''));
        $baseUrl = rtrim((string) config('services.otp.msg91_base_url', 'https://control.msg91.com/api/v5'), '/');
        $countryCode = preg_replace('/\D+/', '', (string) config('services.otp.msg91_country_code', '91')) ?: '91';

        if ($authkey === '' || $templateId === '') {
            return [
                'attempted' => false,
                'delivered' => false,
                'provider' => 'msg91',
                'channel' => 'sms',
                'message' => 'MSG91 authkey or OTP template ID is missing.',
            ];
        }

        $mobile = $this->formatInternationalPhone($phone, $countryCode);

        try {
            $response = Http::timeout(10)
                ->retry(1, 300)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                    'authkey' => $authkey,
                ])
                ->post($baseUrl . '/otp', [
                    'mobile' => $mobile,
                    'template_id' => $templateId,
                    'otp' => $code,
                ]);

            $body = $response->json();
            $bodyText = is_array($body) ? json_encode($body) : $response->body();

            if ($response->successful() && !$this->looksLikeMsg91Failure((string) $bodyText)) {
                return [
                    'attempted' => true,
                    'delivered' => true,
                    'provider' => 'msg91',
                    'channel' => 'sms',
                    'message' => 'OTP sent successfully.',
                    'provider_response' => $body,
                ];
            }

            Log::warning('MSG91 OTP delivery returned non-success response', [
                'phone' => $phone,
                'mobile' => $mobile,
                'status' => $response->status(),
                'body' => $body ?: $response->body(),
            ]);

            return [
                'attempted' => true,
                'delivered' => false,
                'provider' => 'msg91',
                'channel' => 'sms',
                'message' => 'MSG91 OTP delivery failed. Please use fallback for now.',
                'error' => $bodyText,
                'provider_response' => $body,
            ];
        } catch (\Throwable $exception) {
            Log::warning('MSG91 OTP delivery exception', [
                'phone' => $phone,
                'mobile' => $mobile,
                'message' => $exception->getMessage(),
            ]);

            return [
                'attempted' => true,
                'delivered' => false,
                'provider' => 'msg91',
                'channel' => 'sms',
                'message' => 'MSG91 OTP delivery failed. Please use fallback for now.',
                'error' => $exception->getMessage(),
            ];
        }
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

    private function formatInternationalPhone(string $phone, string $countryCode): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';

        if (strlen($digits) === 10) {
            return $countryCode . $digits;
        }

        if (str_starts_with($digits, $countryCode) && strlen($digits) >= 12) {
            return $digits;
        }

        return $digits;
    }

    private function looksLikeMsg91Failure(string $body): bool
    {
        $body = strtolower($body);

        foreach (['invalid', 'error', 'failure', 'failed', 'unauthorized', 'template', 'authkey'] as $needle) {
            if (str_contains($body, $needle)) {
                return true;
            }
        }

        return false;
    }
}
