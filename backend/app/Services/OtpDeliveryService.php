<?php

namespace App\Services;

use App\Services\Email\SocietyFlatsEmailService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpDeliveryService
{
    public function __construct(
        private readonly SocietyFlatsEmailService $emailService
    ) {
    }

    /**
     * @return array{
     *   attempted: bool,
     *   delivered: bool,
     *   provider: string,
     *   channel: string,
     *   message: string,
     *   error?: string|null,
     * }
     */
    public function send(string $phone, string $code, string $channel = 'sms', ?string $email = null): array
    {
        $provider = trim((string) config('services.otp.provider', 'log'));
        $enabled = (bool) config('services.otp.enabled', false);
        $channel = in_array($channel, ['sms', 'whatsapp', 'email'], true) ? $channel : 'sms';

        if (!$enabled || $provider === '' || $provider === 'log') {
            $this->safeLog('info', 'OTP generated but external provider is not enabled', [
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
            'resend' => $this->sendViaResend($email, $code, $channel),
            default => [
                'attempted' => false,
                'delivered' => false,
                'provider' => $provider,
                'channel' => $channel,
                'message' => 'OTP provider is configured but not implemented yet.',
            ],
        };
    }

    private function sendViaResend(?string $email, string $code, string $channel): array
    {
        if ($channel !== 'email') {
            return [
                'attempted' => false,
                'delivered' => false,
                'provider' => 'resend',
                'channel' => $channel,
                'message' => 'Resend OTP provider supports email delivery only.',
            ];
        }

        $result = $this->emailService->sendOtpEmail((string) $email, $code);

        return [
            'attempted' => true,
            'delivered' => (bool) ($result['sent'] ?? false),
            'provider' => 'resend',
            'channel' => 'email',
            'message' => ($result['sent'] ?? false)
                ? 'OTP sent to your email address.'
                : 'Email OTP could not be delivered. Please check the address and try again.',
            'error' => ($result['sent'] ?? false) ? null : 'email_delivery_failed',
        ];
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
                ];
            }

            $this->safeLog('warning', 'MSG91 OTP delivery returned non-success response', [
                'status' => $response->status(),
            ]);

            return [
                'attempted' => true,
                'delivered' => false,
                'provider' => 'msg91',
                'channel' => 'sms',
                'message' => 'MSG91 OTP delivery failed. Please use fallback for now.',
                'error' => 'msg91_delivery_failed',
            ];
        } catch (\Throwable $exception) {
            $this->safeLog('warning', 'MSG91 OTP delivery exception', [
                'exception' => $exception::class,
            ]);

            return [
                'attempted' => true,
                'delivered' => false,
                'provider' => 'msg91',
                'channel' => 'sms',
                'message' => 'MSG91 OTP delivery failed. Please use fallback for now.',
                'error' => 'msg91_delivery_failed',
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
            $this->safeLog('warning', 'OTP webhook delivery failed', [
                'channel' => $channel,
                'exception' => $exception::class,
            ]);

            return [
                'attempted' => true,
                'delivered' => false,
                'provider' => 'webhook',
                'channel' => $channel,
                'message' => 'OTP delivery failed. Please use fallback for now.',
                'error' => 'webhook_delivery_failed',
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

    private function safeLog(string $level, string $message, array $context = []): void
    {
        try {
            Log::log($level, $message, $context);
        } catch (\Throwable) {
            // A logging fault must not break authentication or delivery fallback.
        }
    }
}
