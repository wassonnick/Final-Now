<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Services\Email\SocietyFlatsEmailService;
use App\Services\LeadNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class LeadCaptureResilienceTest extends TestCase
{
    use RefreshDatabase;

    public function test_persisted_lead_returns_success_when_post_capture_services_fail(): void
    {
        $notifications = Mockery::mock(LeadNotificationService::class);
        $notifications->shouldReceive('notifyNewLead')
            ->once()
            ->andThrow(new RuntimeException('Notification provider unavailable'));
        $this->app->instance(LeadNotificationService::class, $notifications);

        $email = Mockery::mock(SocietyFlatsEmailService::class);
        $email->shouldReceive('sendAdminLeadNotification')
            ->once()
            ->andThrow(new RuntimeException('Email provider failed after accepting the request'));
        $email->shouldReceive('sendUserLeadConfirmation')
            ->once()
            ->andThrow(new RuntimeException('Confirmation provider unavailable'));
        $this->app->instance(SocietyFlatsEmailService::class, $email);

        $response = $this->postJson('/api/leads', [
            'name' => 'Lead resilience test',
            'phone' => '9876543210',
            'message' => 'Please arrange a callback.',
            'source' => 'property_page_callback',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('message', 'Lead captured successfully')
            ->assertJsonPath('data.status', 'New')
            ->assertJsonMissingPath('data.phone')
            ->assertJsonMissingPath('data.email')
            ->assertJsonMissingPath('data.message');

        $this->assertDatabaseCount('leads', 1);
        $this->assertDatabaseHas('leads', [
            'name' => 'Lead resilience test',
            'phone' => '9876543210',
            'source' => 'property_page_callback',
            'status' => 'New',
        ]);
    }

    public function test_success_response_contains_only_safe_confirmation_fields(): void
    {
        $notifications = Mockery::mock(LeadNotificationService::class);
        $notifications->shouldReceive('notifyNewLead')->once();
        $this->app->instance(LeadNotificationService::class, $notifications);

        $email = Mockery::mock(SocietyFlatsEmailService::class);
        $email->shouldReceive('sendAdminLeadNotification')->once();
        $email->shouldReceive('sendUserLeadConfirmation')->once();
        $this->app->instance(SocietyFlatsEmailService::class, $email);

        $response = $this->postJson('/api/leads', [
            'name' => 'Safe response test',
            'phone' => '9876543211',
            'email' => 'customer@example.com',
            'message' => 'Private enquiry details',
            'source' => 'website',
        ]);

        $response->assertCreated();

        $this->assertSame([
            'id',
            'property_id',
            'society_id',
            'status',
            'priority',
            'source',
            'created_at',
        ], array_keys($response->json('data')));

        $this->assertSame(1, Lead::query()->count());
    }
}
