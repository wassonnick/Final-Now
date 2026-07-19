<?php

namespace App\Services\Email;

use App\Models\Lead;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class SocietyFlatsEmailService
{
    public function sendAdminLeadNotification(Lead $lead): void
    {
        $type = $this->classifyLead($lead);

        match ($type) {
            'owner' => $this->sendOwnerListingAlert($lead),
            'broker' => $this->sendBrokerSignupAlert($lead),
            default => $this->sendLeadAlert($lead),
        };
    }

    public function sendLeadAlert(Lead $lead): void
    {
        $this->sendAdminAlert(
            'lead_alert',
            $lead,
            'New SocietyFlats lead',
            'A new lead was captured on SocietyFlats.'
        );
    }

    public function sendOwnerListingAlert(Lead $lead): void
    {
        $this->sendAdminAlert(
            'owner_listing_alert',
            $lead,
            'New owner listing submitted',
            'An owner listing lead was submitted from SocietyFlats.'
        );
    }

    public function sendBrokerSignupAlert(Lead $lead): void
    {
        $this->sendAdminAlert(
            'broker_signup_alert',
            $lead,
            'New broker signup/application',
            'A broker partner lead was submitted on SocietyFlats.'
        );
    }

    public function sendUserLeadConfirmation(Lead $lead): void
    {
        $email = trim((string) $lead->email);

        if (! $this->isValidEmail($email)) {
            return;
        }

        $subject = 'We received your SocietyFlats request';
        $summary = $this->safeLine($lead->society_name ?: $lead->property_title ?: $lead->requirement ?: 'your Gurgaon property request');
        $text = implode("\n", [
            'Hi '.$this->safeLine($lead->name ?: 'there').',',
            '',
            'We received your SocietyFlats request for '.$summary.'.',
            'Our team will review it and get back to you shortly.',
            '',
            'SocietyFlats',
        ]);

        $html = $this->wrapHtml($subject, [
            'Hi '.$this->safeLine($lead->name ?: 'there').',',
            'We received your SocietyFlats request for '.$summary.'.',
            'Our team will review it and get back to you shortly.',
        ]);

        $this->sendEmail('user_confirmation', $email, $subject, $html, $text, ['lead_id' => $lead->id]);
    }

    /**
     * @return array{sent: bool, message: string}
     */
    public function sendTestEmail(string $to): array
    {
        if (! $this->isValidEmail($to)) {
            return ['sent' => false, 'message' => 'Enter a valid recipient email address.'];
        }

        $subject = 'SocietyFlats Resend test email';
        $html = $this->wrapHtml($subject, [
            'This is a safe test email from the SocietyFlats backend.',
            'If you received it, the Resend configuration is working.',
        ]);
        $text = "SocietyFlats Resend test email\n\nThis is a safe test email from the SocietyFlats backend.";

        return $this->sendEmail('test_email', $to, $subject, $html, $text);
    }

    private function sendAdminAlert(string $type, Lead $lead, string $subject, string $intro): void
    {
        $to = $this->adminRecipient();

        if (! $this->isValidEmail($to)) {
            $this->logSkipped($type, 'missing_admin_recipient', ['lead_id' => $lead->id]);

            return;
        }

        $lead->loadMissing(['property.society', 'society']);

        $adminUrl = rtrim((string) config('services.societyflats_email.admin_base_url', ''), '/').'/admin/leads/'.$lead->id;
        $rows = [
            'Lead ID' => (string) $lead->id,
            'Name' => $this->safeLine($lead->name),
            'Phone' => $this->safeLine($lead->phone),
            'Email' => $this->safeLine($lead->email ?: 'Not provided'),
            'Source' => $this->safeLine($lead->source ?: 'Website'),
            'Priority' => $this->safeLine($lead->priority ?: 'Warm'),
            'Requirement' => $this->safeLine($lead->requirement ?: 'Not specified'),
            'Society' => $this->safeLine($lead->society_name ?: optional($lead->society)->name ?: optional(optional($lead->property)->society)->name ?: 'Not specified'),
            'Property' => $this->safeLine($lead->property_title ?: optional($lead->property)->title ?: 'Not specified'),
            'Budget' => $this->safeLine($lead->budget ?: 'Not specified'),
            'Message' => $this->safeParagraph($lead->message ?: 'Not provided'),
            'Admin URL' => $adminUrl,
        ];

        $html = $this->wrapHtml($subject, [$intro], $rows);
        $text = $intro."\n\n".$this->rowsToText($rows);

        $this->sendEmail($type, $to, $subject, $html, $text, ['lead_id' => $lead->id]);
    }

    /**
     * @return array{sent: bool, message: string}
     */
    private function sendEmail(string $type, string $to, string $subject, string $html, string $text, array $context = []): array
    {
        $key = trim((string) config('services.resend.key', ''));

        if ($key === '') {
            $this->logSkipped($type, 'missing_resend_api_key', $context);

            return ['sent' => false, 'message' => 'RESEND_API_KEY is not configured. Email skipped safely.'];
        }

        $fromAddress = trim((string) config('mail.from.address', ''));
        $fromName = trim((string) config('mail.from.name', 'SocietyFlats'));

        if (! $this->isValidEmail($fromAddress)) {
            $this->logSkipped($type, 'invalid_mail_from_address', $context);

            return ['sent' => false, 'message' => 'MAIL_FROM_ADDRESS is not configured as a valid email.'];
        }

        try {
            $response = Http::timeout(10)
                ->retry(1, 300)
                ->withToken($key)
                ->acceptJson()
                ->post((string) config('services.resend.endpoint', 'https://api.resend.com/emails'), [
                    'from' => $this->formatFrom($fromName, $fromAddress),
                    'to' => [$to],
                    'subject' => $subject,
                    'html' => $html,
                    'text' => $text,
                ]);

            if ($response->failed()) {
                Log::warning('SocietyFlats Resend email failed', [
                    'type' => $type,
                    'status' => $response->status(),
                    ...$context,
                ]);

                return ['sent' => false, 'message' => 'Resend returned HTTP '.$response->status().'.'];
            }

            Log::info('SocietyFlats Resend email sent', [
                'type' => $type,
                'to' => $this->maskEmail($to),
                ...$context,
            ]);

            return ['sent' => true, 'message' => 'Test email sent through Resend.'];
        } catch (Throwable $exception) {
            Log::warning('SocietyFlats Resend email exception', [
                'type' => $type,
                'message' => $exception->getMessage(),
                ...$context,
            ]);

            return ['sent' => false, 'message' => 'Email failed safely: '.$exception->getMessage()];
        }
    }

    private function adminRecipient(): string
    {
        return trim((string) (
            config('services.societyflats_email.lead_alert_email')
            ?: config('services.societyflats_email.admin_email')
            ?: ''
        ));
    }

    private function classifyLead(Lead $lead): string
    {
        $text = strtolower(implode(' ', array_filter([
            $lead->source,
            $lead->source_page,
            $lead->page_url,
            $lead->lead_intent,
            $lead->entity_type,
            $lead->requirement,
            $lead->message,
        ])));

        if (str_contains($text, 'broker')) {
            return 'broker';
        }

        if (
            str_contains($text, 'owner_listing')
            || str_contains($text, 'owner listing')
            || str_contains($text, '/sell')
            || str_contains($text, 'sell_page')
            || str_contains($text, 'seller')
        ) {
            return 'owner';
        }

        return 'lead';
    }

    private function wrapHtml(string $title, array $paragraphs, array $rows = []): string
    {
        $paragraphHtml = collect($paragraphs)
            ->filter(fn ($line) => trim((string) $line) !== '')
            ->map(fn ($line) => '<p style="margin:0 0 14px;color:#334155;line-height:1.55;">'.e((string) $line).'</p>')
            ->implode('');

        $rowsHtml = collect($rows)
            ->map(fn ($value, $label) => '<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-weight:700;">'.e((string) $label).'</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">'.e((string) $value).'</td></tr>')
            ->implode('');

        $table = $rowsHtml !== '' ? '<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">'.$rowsHtml.'</table>' : '';

        return '<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;">'
            .'<div style="max-width:680px;margin:0 auto;padding:28px;">'
            .'<div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;">'
            .'<p style="margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">SocietyFlats</p>'
            .'<h1 style="margin:0 0 18px;color:#0f172a;font-size:24px;line-height:1.2;">'.e($title).'</h1>'
            .$paragraphHtml.$table
            .'</div></div></body></html>';
    }

    private function rowsToText(array $rows): string
    {
        return collect($rows)
            ->map(fn ($value, $label) => $label.': '.$value)
            ->implode("\n");
    }

    private function safeLine(?string $value): string
    {
        return Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags((string) $value))), 240);
    }

    private function safeParagraph(?string $value): string
    {
        return Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags((string) $value))), 1200);
    }

    private function formatFrom(string $name, string $address): string
    {
        $cleanName = str_replace(['"', '<', '>'], '', $name ?: 'SocietyFlats');

        return $cleanName.' <'.$address.'>';
    }

    private function isValidEmail(?string $email): bool
    {
        return filter_var(trim((string) $email), FILTER_VALIDATE_EMAIL) !== false;
    }

    private function logSkipped(string $type, string $reason, array $context = []): void
    {
        Log::warning('SocietyFlats email skipped', [
            'type' => $type,
            'reason' => $reason,
            ...$context,
        ]);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return Str::limit($local, 2, '***').'@'.$domain;
    }
}
