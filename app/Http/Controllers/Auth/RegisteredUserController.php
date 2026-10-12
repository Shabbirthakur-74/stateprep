<?php

namespace App\Http\Controllers\Auth;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Controllers\HomeController;
use App\Models\User;
use App\Rules\PasswordConfirmation;
use App\Rules\PersonName;
use App\Rules\StrongPassword;
use App\Rules\ValidEmail;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    /**
     * Sign-up is a sidebar on the home page; this address opens it.
     */
    public function create(Request $request): RedirectResponse
    {
        return HomeController::prompt($request, 'register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        // The same checks, with the same messages, as the sign-up form runs in the browser (auth-validation.ts).
        $request->validate([
            'name' => [new PersonName],
            'email' => [new ValidEmail, 'lowercase', 'unique:'.User::class],
            'password' => [new StrongPassword],
            'password_confirmation' => [new PasswordConfirmation],
        ], [
            'email.lowercase' => 'Use lower-case letters in the email address.',
            'email.unique' => 'An account with this email already exists. Log in instead.',
        ]);

        // `role` is deliberately not mass-assignable (so it can't be injected from the form), hence forceCreate.
        $user = User::forceCreate([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => Role::Student,
        ]);

        event(new Registered($user));

        Auth::login($user);

        // e.g. back to an exam's payment page when signing up from its "Buy" button.
        return redirect()->intended(route('student.dashboard', absolute: false));
    }
}
