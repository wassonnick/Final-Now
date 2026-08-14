<?php

namespace App\Support;

/**
 * The roles an account can hold.
 *
 * The same three were written out by hand in three separate validation rules, so adding a
 * role meant finding all three and any one of them could quietly drift. Kept as a plain
 * class rather than an enum cast on the column: rows predate this and may hold values that
 * are no longer offered, and a cast would turn reading one of those into an exception.
 *
 * Deliberately not a capability matrix. What an account may do is decided by approved
 * claims — an RWA announcement needs an approved RWA claim for that society, not a role —
 * and inventing a second, unenforced permission model beside the real one would be worse
 * than none.
 */
final class AccountRole
{
    public const CUSTOMER = 'customer';

    public const BROKER = 'broker';

    public const RWA = 'rwa';

    /**
     * Roles a person can choose when signing up.
     *
     * "owner" and "builder" are not here on purpose: an owner is someone who has listed a
     * flat, and a builder is an account with an approved builder claim. Both are earned,
     * not selected, and offering them at signup would let anyone assert either.
     *
     * @return array<int,string>
     */
    public static function signupRoles(): array
    {
        return [self::CUSTOMER, self::BROKER, self::RWA];
    }

    public static function label(?string $role): string
    {
        return match ($role) {
            self::BROKER => 'Broker',
            self::RWA => 'RWA member',
            self::CUSTOMER => 'Customer',
            default => 'Member',
        };
    }

    public static function isSignupRole(?string $role): bool
    {
        return in_array((string) $role, self::signupRoles(), true);
    }
}
