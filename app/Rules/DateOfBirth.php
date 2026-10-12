<?php

namespace App\Rules;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A date of birth as YYYY-MM-DD (what the date picker sends): a real date, not in the future, for someone aged
 * 12 to 80. Keep the checks and messages the same as dateOfBirthError() in resources/js/lib/profile-validation.ts.
 */
class DateOfBirth implements ValidationRule
{
    public const MIN_AGE = 12;

    public const MAX_AGE = 80;

    /** Runs on empty values too, so "Enter your date of birth." comes from here like it does in the browser. */
    public bool $implicit = true;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($message = self::problem((string) $value)) {
            $fail($message);
        }
    }

    public static function problem(string $value, ?string $today = null): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return 'Enter your date of birth.';
        }

        if (! preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m) || ! checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return 'Enter a valid date of birth.';
        }

        $today = CarbonImmutable::parse($today ?? now()->toDateString())->startOfDay();
        $born = CarbonImmutable::createFromDate((int) $m[1], (int) $m[2], (int) $m[3])->startOfDay();
        $age = (int) $born->diffInYears($today);

        return match (true) {
            $born->greaterThan($today) => 'The date of birth cannot be in the future.',
            $age < self::MIN_AGE => 'You must be at least '.self::MIN_AGE.' years old.',
            $age > self::MAX_AGE => 'Enter a valid date of birth.',
            default => null,
        };
    }
}
