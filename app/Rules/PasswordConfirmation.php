<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The "confirm password" field must repeat the password. The error is shown under the confirmation field, as in
 * the browser. Keep the messages the same as confirmationError() in resources/js/lib/auth-validation.ts.
 */
class PasswordConfirmation implements DataAwareRule, ValidationRule
{
    public bool $implicit = true;

    private array $data = [];

    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $confirmation = (string) $value;

        if ($confirmation === '') {
            $fail('Type your password again.');
        } elseif ($confirmation !== (string) ($this->data['password'] ?? '')) {
            $fail('The passwords do not match.');
        }
    }
}
