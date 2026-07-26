<?php

namespace App\Services\Email;

use App\Models\Account;
use App\Models\EmailDelivery;
use App\Models\Lead;
use App\Models\NriCase;
use App\Models\Referral;
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

    public function sendNriCaseAdminAlert(NriCase $case): void
    {
        $to = $this->adminRecipient();
        if (! $this->isValidEmail($to)) {
            $context = ['nri_case_id' => $case->id];
            $this->logSkipped('nri_case_alert', 'missing_admin_recipient', $context);
            $this->recordDelivery('nri_case_alert', $to, 'skipped', $context, failureReason: 'missing_admin_recipient');
            return;
        }

        $subject = 'New NRI ownership request';
        $rows = [
            'Case reference' => 'NRI-'.$case->id,
            'Name' => $this->safeLine($case->name),
            'Country' => $this->safeLine($case->country),
            'Preferred contact' => $this->safeLine($case->contact_method),
            'Phone' => $this->safeLine($case->phone ?: 'Not provided'),
            'Email' => $this->safeLine($case->email ?: 'Not provided'),
            'Service' => $this->safeLine(str_replace('_', ' ', $case->service_type)),
            'Property context' => $this->safeLine($case->property_context ?: 'Not provided'),
            'Notes' => $this->safeParagraph($case->notes ?: 'Not provided'),
            'Admin URL' => $this->adminUrl('/admin/nri-cases'),
        ];

        $this->sendEmail(
            'nri_case_alert',
            $to,
            $subject,
            $this->wrapHtml($subject, ['A new overseas-owner request was submitted for review.'], $rows),
            "A new overseas-owner request was submitted for review.\n\n".$this->rowsToText($rows),
            ['nri_case_id' => $case->id]
        );
    }

    public function sendNriCaseConfirmation(NriCase $case): void
    {
        if (! $this->isValidEmail($case->email)) {
            return;
        }

        $subject = 'We received your NRI ownership request';
        $lines = [
            'Hi '.$this->safeLine($case->name ?: 'there').',',
            'We received your request (NRI-'.$case->id.'). Our team will review it before contacting you.',
            'SocietyFlats coordinates property services; legal, tax, FEMA and remittance advice should be independently verified.',
        ];
        $this->sendEmail(
            'nri_case_confirmation',
            (string) $case->email,
            $subject,
            $this->wrapHtml($subject, $lines),
            implode("\n\n", $lines),
            ['nri_case_id' => $case->id]
        );
    }

    public function sendReferralAdminAlert(Referral $referral, Account $referrer): void
    {
        $to = $this->adminRecipient();
        if (! $this->isValidEmail($to)) {
            $context = ['referral_id' => $referral->id];
            $this->logSkipped('referral_alert', 'missing_admin_recipient', $context);
            $this->recordDelivery('referral_alert', $to, 'skipped', $context, failureReason: 'missing_admin_recipient');
            return;
        }

        $subject = 'New referral submitted';
        $rows = [
            'Referral ID' => (string) $referral->id,
            'Referred person' => $this->safeLine($referral->referred_name),
            'Referred phone' => $this->safeLine($referral->referred_phone),
            'Intent' => $this->safeLine($referral->intent),
            'Referrer account' => '#'.$referrer->id.' · '.$this->safeLine($referrer->name ?: 'Account holder'),
            'Notes' => $this->safeParagraph($referral->notes ?: 'Not provided'),
            'Admin URL' => $this->adminUrl('/admin/referrals'),
        ];

        $this->sendEmail(
            'referral_alert',
            $to,
            $subject,
            $this->wrapHtml($subject, ['A new referral is waiting for manual qualification.'], $rows),
            "A new referral is waiting for manual qualification.\n\n".$this->rowsToText($rows),
            ['referral_id' => $referral->id]
        );
    }

    public function sendReferralConfirmation(Referral $referral, Account $referrer): void
    {
        if (! $this->isValidEmail($referrer->email)) {
            return;
        }

        $subject = 'Your SocietyFlats referral was received';
        $lines = [
            'Hi '.$this->safeLine($referrer->name ?: 'there').',',
            'Your referral for '.$this->safeLine($referral->referred_name).' was received for admin review.',
            'Rewards are reviewed only after a genuine conversion and are not guaranteed by submission.',
        ];
        $this->sendEmail(
            'referral_confirmation',
            (string) $referrer->email,
            $subject,
            $this->wrapHtml($subject, $lines),
            implode("\n\n", $lines),
            ['referral_id' => $referral->id]
        );
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
            $context = ['lead_id' => $lead->id];
            $this->logSkipped($type, 'missing_admin_recipient', $context);
            $this->recordDelivery($type, $to, 'skipped', $context, failureReason: 'missing_admin_recipient');

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

        $this->sendEmail($type, $to, $subject, $html, $text, ['lead_id' => $lead->id], $lead->email);
    }

    /**
     * @return array{sent: bool, message: string}
     */
    private function sendEmail(
        string $type,
        string $to,
        string $subject,
        string $html,
        string $text,
        array $context = [],
        ?string $replyTo = null
    ): array
    {
        $key = trim((string) config('services.resend.key', ''));

        if ($key === '') {
            $this->logSkipped($type, 'missing_resend_api_key', $context);

            $this->recordDelivery($type, $to, 'skipped', $context, failureReason: 'missing_resend_api_key');
            return ['sent' => false, 'message' => 'Email provider is not configured. Delivery was skipped safely.'];
        }

        $fromAddress = trim((string) config('mail.from.address', ''));
        $fromName = trim((string) config('mail.from.name', 'SocietyFlats'));

        if (! $this->isValidEmail($fromAddress)) {
            $this->logSkipped($type, 'invalid_mail_from_address', $context);

            $this->recordDelivery($type, $to, 'skipped', $context, failureReason: 'invalid_mail_from_address');
            return ['sent' => false, 'message' => 'Sender address is invalid. Delivery was skipped safely.'];
        }

        try {
            $payload = [
                'from' => $this->formatFrom($fromName, $fromAddress),
                'to' => [$to],
                'subject' => $subject,
                'html' => $html,
                'text' => $text,
            ];
            $resolvedReplyTo = $this->isValidEmail($replyTo)
                ? trim((string) $replyTo)
                : trim((string) config('services.societyflats_email.reply_to', ''));
            if ($this->isValidEmail($resolvedReplyTo)) {
                $payload['reply_to'] = $resolvedReplyTo;
            }

            $response = Http::timeout(10)
                ->retry(1, 300)
                ->withToken($key)
                ->acceptJson()
                ->post((string) config('services.resend.endpoint', 'https://api.resend.com/emails'), $payload);

            if ($response->failed()) {
                $reason = 'provider_http_'.$response->status();
                Log::warning('SocietyFlats Resend email failed', [
                    'type' => $type,
                    'status' => $response->status(),
                    ...$context,
                ]);
                $this->recordDelivery($type, $to, 'failed', $context, $response->status(), failureReason: $reason);

                return ['sent' => false, 'message' => 'Resend returned HTTP '.$response->status().'.'];
            }

            $providerMessageId = $this->safeLine((string) ($response->json('id') ?? '')) ?: null;
            Log::info('SocietyFlats Resend email sent', [
                'type' => $type,
                'to' => $this->maskEmail($to),
                ...$context,
            ]);
            $this->recordDelivery($type, $to, 'sent', $context, $response->status(), $providerMessageId);

            return ['sent' => true, 'message' => 'Email accepted by Resend.'];
        } catch (Throwable $exception) {
            $reason = $this->safeFailureReason($exception->getMessage());
            Log::warning('SocietyFlats Resend email exception', [
                'type' => $type,
                'exception' => $exception::class,
                ...$context,
            ]);
            $this->recordDelivery($type, $to, 'failed', $context, failureReason: $reason);

            return ['sent' => false, 'message' => 'Email delivery failed safely.'];
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

        return '<!doctype html><html><body style="margin:0;background:#f5f2ec;font-family:Arial,sans-serif;">'
            .'<div style="display:none;max-height:0;overflow:hidden;">'.e($title).'</div>'
            .'<div style="max-width:680px;margin:0 auto;padding:28px 16px;">'
            .'<div style="background:#10254f;border-radius:18px 18px 0 0;padding:22px 28px;">'
            .'<p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-.02em;">SocietyFlats</p>'
            .'<p style="margin:5px 0 0;color:#b9c9ec;font-size:12px;">Verified society intelligence · Real property journeys</p></div>'
            .'<div style="background:#fff;border:1px solid #dde3ee;border-top:0;border-radius:0 0 18px 18px;padding:28px;">'
            .'<h1 style="margin:0 0 18px;color:#101828;font-size:24px;line-height:1.25;">'.e($title).'</h1>'
            .$paragraphHtml.$table
            .'<div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:1.6;">'
            .'SocietyFlats · <a href="https://www.societyflats.com/trust" style="color:#2757b7;">How verification works</a> · '
            .'<a href="https://www.societyflats.com/privacy" style="color:#2757b7;">Privacy</a></div>'
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

    private function adminUrl(string $path): string
    {
        return rtrim((string) config('services.societyflats_email.admin_base_url', ''), '/').$path;
    }

    private function recordDelivery(
        string $type,
        string $to,
        string $status,
        array $context,
        ?int $httpStatus = null,
        ?string $providerMessageId = null,
        ?string $failureReason = null
    ): void {
        try {
            $relatedKey = null;
            $relatedId = null;
            foreach ($context as $key => $value) {
                if (str_ends_with((string) $key, '_id')) {
                    $relatedKey = (string) $key;
                    $relatedId = $value;
                    break;
                }
            }

            EmailDelivery::create([
                'message_type' => $type,
                'recipient_masked' => $this->maskEmail($to),
                'related_type' => $relatedKey ? Str::beforeLast($relatedKey, '_id') : null,
                'related_id' => is_numeric($relatedId) ? (int) $relatedId : null,
                'provider' => 'resend',
                'provider_message_id' => $providerMessageId,
                'status' => $status,
                'http_status' => $httpStatus,
                'failure_reason' => $failureReason ? $this->safeFailureReason($failureReason) : null,
                'metadata' => ['tracked_at' => now()->toISOString()],
            ]);
        } catch (Throwable) {
            // Tracking must never affect the submission or provider outcome.
        }
    }

    private function safeFailureReason(string $reason): string
    {
        $safe = preg_replace('/(bearer|token|key|secret|password)[\\s:=]+[^\\s,;]+/i', '$1=[redacted]', $reason);

        return Str::limit($this->safeLine($safe), 500);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return Str::limit($local, 2, '***').'@'.$domain;
    }
}
