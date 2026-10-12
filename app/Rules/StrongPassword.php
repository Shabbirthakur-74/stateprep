<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A new password: at least 8 characters with a capital letter, a number and a special character.
 * Keep the checks, their order and their messages the same as newPasswordError() in resources/js/lib/auth-validation.ts.
 */
class StrongPassword implements ValidationRule
{
    public const MIN = 8;

    public const MAX = 255;

    /** Runs on empty values too, so "Choose a password." comes from here like it does in the browser. */
    public bool $implicit;

    /** @param  bool  $required  False when editing an account, where an empty password keeps the old one. */
    public function __construct(bool $required = true)
    {
        $this->implicit = $required;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($message = self::problem((string) $value)) {
            $fail($message);
        }
    }

    public static function problem(string $value): ?string
    {
        return match (true) {
            $value === '' => 'Choose a password.',
            trim($value) === '' => 'The password cannot be only spaces.',
            mb_strlen($value) < self::MIN => 'The password must be at least '.self::MIN.' characters.',
            mb_strlen($value) > self::MAX => 'The password must be '.self::MAX.' characters or fewer.',
            ! preg_match('/\p{Lu}/u', $value) => 'The password must contain at least one capital letter.',
            ! preg_match('/\p{N}/u', $value) => 'The password must contain at least one number.',
            ! preg_match('/[^\p{L}\p{N}\s]/u', $value) => 'The password must contain at least one special character, like ! @ # $ %.',
            default => null,
        };
    }
}
