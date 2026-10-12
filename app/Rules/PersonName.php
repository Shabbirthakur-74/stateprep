<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A person's name: letters of any script, with spaces, dots, apostrophes and hyphens ("R. K. Sharma", "D'Souza").
 * Keep the checks, their order and their messages the same as nameError() in resources/js/lib/auth-validation.ts.
 */
class PersonName implements ValidationRule
{
    public const MIN = 2;

    public const MAX = 255;

    /** Runs on empty values too, so "Enter your name." comes from here like it does in the browser. */
    public bool $implicit = true;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($message = self::problem((string) $value)) {
            $fail($message);
        }
    }

    public static function problem(string $value): ?string
    {
        $name = trim($value);

        return match (true) {
            $name === '' => 'Enter your name.',
            mb_strlen($name) < self::MIN => 'Your name must be at least '.self::MIN.' characters.',
            mb_strlen($name) > self::MAX => 'Your name must be '.self::MAX.' characters or fewer.',
            ! preg_match("/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u", $name) => 'Use letters only (spaces, dots, apostrophes and hyphens are fine).',
            default => null,
        };
    }
}
