<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Lead;
use App\Models\NriCase;
use App\Models\Referral;
use App\Services\Email\SocietyFlatsEmailService;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Notifications are deliberately secondary to persisting a public submission.
 * Provider, webhook, tracking, or logging outages must never turn a saved
 * enquiry into a false HTTP error that encourages a duplicate submission.
 */
class SubmissionNotificationService
{
    public function __construct(
        private readonly LeadNotificationService $leadNotifications,
        private readonly SocietyFlatsEmailService $email,
    ) {
    }

    public function lead(Lead $lead): void
    {
        $this->safely('lead', $lead->id, 'lead_notification', fn () => $this->leadNotifications->notifyNewLead($lead));
        $this->safely('lead', $lead->id, 'admin_email', fn () => $this->email->sendAdminLeadNotification($lead));
        $this->safely('lead', $lead->id, 'user_email', fn () => $this->email->sendUserLeadConfirmation($lead));
    }

    public function ownerListing(Lead $lead): void
    {
        $this->safely('owner_listing', $lead->id, 'lead_notification', fn () => $this->leadNotifications->notifyNewLead($lead));
        $this->safely('owner_listing', $lead->id, 'admin_email', fn () => $this->email->sendOwnerListingAlert($lead));
        $this->safely('owner_listing', $lead->id, 'user_email', fn () => $this->email->sendUserLeadConfirmation($lead));
    }

    public function nriCase(NriCase $case): void
    {
        $this->safely('nri_case', $case->id, 'admin_email', fn () => $this->email->sendNriCaseAdminAlert($case));
        $this->safely('nri_case', $case->id, 'user_email', fn () => $this->email->sendNriCaseConfirmation($case));
    }

    public function referral(Referral $referral, Account $referrer): void
    {
        $this->safely('referral', $referral->id, 'admin_email', fn () => $this->email->sendReferralAdminAlert($referral, $referrer));
        $this->safely('referral', $referral->id, 'user_email', fn () => $this->email->sendReferralConfirmation($referral, $referrer));
    }

    private function safely(string $entityType, int $entityId, string $channel, callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $exception) {
            try {
                Log::warning('Submission post-capture notification failed', [
                    'entity_type' => $entityType,
                    'entity_id' => $entityId,
                    'channel' => $channel,
                    'exception' => $exception::class,
                ]);
            } catch (Throwable) {
                // The submission is already persisted. Logging must not change the response.
            }
        }
    }
}
