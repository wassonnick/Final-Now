<?php

namespace App\Services;

use App\Models\Lead;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LeadNotificationService
{
    public function notifyNewLead(Lead $lead): void
    {
        $enabled = (bool) config('services.lead_notifications.enabled', false);
        $webhookUrl = trim((string) config('services.lead_notifications.webhook_url', ''));

        if (!$enabled || $webhookUrl === '') {
            return;
        }

        $lead->loadMissing(['property.society', 'society']);

        $payload = [
            'event' => 'new_lead',
            'lead_id' => $lead->id,
            'name' => $lead->name,
            'phone' => $lead->phone,
            'email' => $lead->email,
            'requirement' => $lead->requirement,
            'budget' => $lead->budget,
            'source' => $lead->source,
            'status' => $lead->status,
            'priority' => $lead->priority,
            'society_name' => $lead->society_name ?: optional($lead->society)->name ?: optional(optional($lead->property)->society)->name,
            'property_title' => $lead->property_title ?: optional($lead->property)->title,
            'property_slug' => $lead->property_slug ?: optional($lead->property)->slug,
            'message' => $lead->message,
            'admin_url' => rtrim((string) config('services.lead_notifications.admin_base_url', ''), '/') . '/admin/leads/' . $lead->id,
            'whatsapp_text' => $this->formatWhatsAppText($lead),
            'created_at' => optional($lead->created_at)->toISOString(),
        ];

        try {
            Http::timeout(8)
                ->retry(1, 300)
                ->withHeaders($this->headers())
                ->post($webhookUrl, $payload)
                ->throw();
        } catch (\Throwable $exception) {
            Log::warning('Lead notification failed', [
                'lead_id' => $lead->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function headers(): array
    {
        $headers = [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];

        $token = trim((string) config('services.lead_notifications.webhook_token', ''));

        if ($token !== '') {
            $headers['Authorization'] = 'Bearer ' . $token;
            $headers['X-Webhook-Token'] = $token;
        }

        return $headers;
    }

    private function formatWhatsAppText(Lead $lead): string
    {
        $society = $lead->society_name ?: optional($lead->society)->name ?: optional(optional($lead->property)->society)->name ?: 'Not specified';
        $property = $lead->property_title ?: optional($lead->property)->title ?: 'Not specified';
        $adminUrl = rtrim((string) config('services.lead_notifications.admin_base_url', ''), '/') . '/admin/leads/' . $lead->id;

        return implode("\n", array_filter([
            'New SocietyFlats lead',
            'Name: ' . $lead->name,
            'Phone: ' . $lead->phone,
            $lead->email ? 'Email: ' . $lead->email : null,
            'Requirement: ' . ($lead->requirement ?: 'Not specified'),
            'Society: ' . $society,
            'Property: ' . $property,
            $lead->budget ? 'Budget: ' . $lead->budget : null,
            'Source: ' . ($lead->source ?: 'Website'),
            'Priority: ' . ($lead->priority ?: 'Warm'),
            $lead->message ? 'Message: ' . $lead->message : null,
            $adminUrl !== '/admin/leads/' . $lead->id ? 'Open lead: ' . $adminUrl : null,
        ]));
    }
}
