<?php

namespace App\Console\Commands;

use App\Services\Email\SocietyFlatsEmailService;
use Illuminate\Console\Command;

class TestResendEmail extends Command
{
    protected $signature = 'societyflats:test-resend-email {to : Recipient email address}';

    protected $description = 'Send a safe SocietyFlats Resend test email without exposing secrets';

    public function handle(SocietyFlatsEmailService $email): int
    {
        $result = $email->sendTestEmail((string) $this->argument('to'));

        if ($result['sent']) {
            $this->info($result['message']);

            return self::SUCCESS;
        }

        $this->warn($result['message']);

        return self::FAILURE;
    }
}
