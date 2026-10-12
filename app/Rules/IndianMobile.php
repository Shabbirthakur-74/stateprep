<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * An Indian mobile number: 10 digits starting with 6–9. Spaces, dashes, brackets and a +91, 91 or 0 prefix are
 * allowed and removed by normalize(). Keep the checks and messages the same as phoneError() in
 * resources/js/lib/profile-validation.ts.
 */
class IndianMobile implements ValidationRule
{
    /** Runs on empty values too, so "Enter your mobile number." comes from here like it does in the browser. */
    public bool $implicit = true;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($message = self::problem((string) $value)) {
            $fail($message);
        }
    }

    public static function problem(string $value): ?string
    {
        $phone = trim($value);

        return match (true) {
            $phone === '' => 'Enter your mobile number.',
            (bool) preg_match('/[^\d\s()+-]/', $phone) => 'The mobile number can only contain digits.',
            ! preg_match('/^[6-9]\d{9}$/', self::normalize($phone)) => 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.',
            default => null,
        };
    }

    /**
     * The 10 digits: "+91 98765-43210", "098765 43210" and "9876543210" all become "9876543210".
     */
    public static function normalize(string $value): string
    {
        $digits = preg_replace('/\D/', '', $value);

        return match (true) {
            strlen($digits) === 12 && str_starts_with($digits, '91') => substr($digits, 2),
            strlen($digits) === 11 && str_starts_with($digits, '0') => substr($digits, 1),
            default => $digits,
        };
    }
}
