<?php

use App\Models\User;
use App\Rules\DateOfBirth;
use App\Rules\IndianMobile;
use App\Rules\PersonName;
use App\Rules\StrongPassword;
use App\Rules\ValidEmail;

/**
 * The server rules give the same answer, word for word, as the browser checks for the same inputs
 * (tests/fixtures/auth-validation-cases.json is shared with resources/js/lib/auth-validation.ts).
 */
dataset('auth cases', function () {
    $cases = json_decode(file_get_contents(__DIR__.'/../../fixtures/auth-validation-cases.json'), true);
    $rules = [
        'email' => ValidEmail::class, 'name' => PersonName::class, 'password' => StrongPassword::class,
        'phone' => IndianMobile::class, 'date_of_birth' => DateOfBirth::class,
    ];

    foreach ($rules as $field => $rule) {
        foreach ($cases[$field] as [$input, $message]) {
            yield "{$field}: ".json_encode($input, JSON_UNESCAPED_UNICODE) => [$rule, $input, $message, $cases['_today']];
        }
    }
});

test('server rules match the browser checks', function (string $rule, string $input, ?string $message, string $today) {
    $problem = $rule === DateOfBirth::class ? DateOfBirth::problem($input, $today) : $rule::problem($input);

    expect($problem)->toBe($message);
})->with('auth cases');

test('sign-up refuses a weak password with the same message as the form', function () {
    $this->post('/register', ['name' => 'Asha', 'email' => 'asha@example.com', 'password' => 'password12', 'password_confirmation' => 'password12'])
        ->assertSessionHasErrors(['password' => 'The password must contain at least one capital letter.']);

    expect(User::count())->toBe(0);
});

test('sign-up shows a mismatched confirmation under the confirmation field', function () {
    $this->post('/register', ['name' => 'Asha', 'email' => 'asha@example.com', 'password' => 'Password@12', 'password_confirmation' => 'Password@13'])
        ->assertSessionHasErrors(['password_confirmation' => 'The passwords do not match.'])
        ->assertSessionDoesntHaveErrors('password');
});

test('sign-up checks the name and email like the form does', function () {
    $this->post('/register', ['name' => 'Asha123', 'email' => 'asha@gmail', 'password' => 'Password@12', 'password_confirmation' => 'Password@12'])
        ->assertSessionHasErrors([
            'name' => 'Use letters only (spaces, dots, apostrophes and hyphens are fine).',
            'email' => 'Enter a valid email address, like name@example.com.',
        ]);
});

test('an empty sign-up gets every message the form shows', function () {
    $this->post('/register', [])->assertSessionHasErrors([
        'name' => 'Enter your name.',
        'email' => 'Enter your email address.',
        'password' => 'Choose a password.',
        'password_confirmation' => 'Type your password again.',
    ]);
});

test('login checks the email format and asks for the password', function () {
    $this->post('/login', ['email' => 'not-an-email', 'password' => ''])->assertSessionHasErrors([
        'email' => 'Enter a valid email address, like name@example.com.',
        'password' => 'Enter your password.',
    ]);

    $this->post('/admin/login', ['email' => '', 'password' => 'x'])->assertSessionHasErrors(['email' => 'Enter your email address.']);
});

test('team member passwords follow the same rules, and editing can keep the old one', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->post('/admin/team', ['name' => 'Editor', 'email' => 'editor@example.com', 'password' => 'secret-pass-123', 'role' => 'staff'])
        ->assertSessionHasErrors(['password' => 'The password must contain at least one capital letter.']);

    $member = User::factory()->staff()->create();
    $this->put("/admin/team/{$member->id}", ['name' => $member->name, 'email' => $member->email, 'password' => '', 'role' => 'staff'])
        ->assertSessionHasNoErrors();
});
