<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * An email address for logging in or signing up.
 * Keep the checks, their order and their messages the same as emailError() in resources/js/lib/auth-validation.ts.
 */
class ValidEmail implements ValidationRule
{
    public const MAX = 255;

    /** Something@domain.tld: no spaces, one @, and a dot in the domain followed by at least two letters. */
    public const PATTERN = '/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-zA-Z]{2,}$/';

    /** Runs on empty values too, so "Enter your email address." comes from here like it does in the browser. */
    public bool $implicit = true;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($message = self::problem((string) $value)) {
            $fail($message);
        }
    }

    public static function problem(string $value): ?string
    {
        $email = trim($value);

        return match (true) {
            $email === '' => 'Enter your email address.',
            (bool) preg_match('/\s/u', $email) => 'An email address cannot contain spaces.',
            mb_strlen($email) > self::MAX => 'The email address must be '.self::MAX.' characters or fewer.',
            ! preg_match(self::PATTERN, $email) => 'Enter a valid email address, like name@example.com.',
            default => null,
        };
    }
}
