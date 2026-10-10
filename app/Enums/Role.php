<?php

namespace App\Enums;

/**
 * Account type. Staff members get their actual permissions from the custom role (AdminRole) assigned to them.
 */
enum Role: string
{
    case Student = 'student';
    case SuperAdmin = 'super_admin';
    case Staff = 'staff';

    public function label(): string
    {
        return match ($this) {
            self::Student => 'Student',
            self::SuperAdmin => 'Super Admin',
            self::Staff => 'Staff',
        };
    }

    /**
     * Staff accounts are everything that can sign in to the admin area.
     */
    public function isStaff(): bool
    {
        return $this !== self::Student;
    }

    /**
     * @return list<self>
     */
    public static function staff(): array
    {
        return [self::SuperAdmin, self::Staff];
    }
}
