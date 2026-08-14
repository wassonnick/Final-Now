<?php

namespace App\Support;

/**
 * Whether an account may sign in.
 *
 * The vocabulary had drifted the way the role list had: admin validation offered
 * active/otp_pending/blocked, the middleware only asks whether the value is 'active', and
 * tests had invented 'suspended' — which worked by accident, because anything that is not
 * 'active' is refused. One definition so a status an admin can set is a status the rest of
 * the system recognises.
 */
final class AccountStatus
{
    public const ACTIVE = 'active';

    /** Signed up but has not completed an OTP yet. */
    public const OTP_PENDING = 'otp_pending';

    /** Deliberately locked out by an admin. */
    public const BLOCKED = 'blocked';

    /** @return array<int,string> */
    public static function all(): array
    {
        return [self::ACTIVE, self::OTP_PENDING, self::BLOCKED];
    }

    public static function allowsSignIn(?string $status): bool
    {
        return $status === self::ACTIVE;
    }

    public static function label(?string $status): string
    {
        return match ($status) {
            self::ACTIVE => 'Active',
            self::OTP_PENDING => 'Awaiting OTP',
            self::BLOCKED => 'Blocked',
            default => 'Unknown',
        };
    }
}
