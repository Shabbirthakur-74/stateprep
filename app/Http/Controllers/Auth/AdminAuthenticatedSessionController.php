<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\HomeController;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AdminAuthenticatedSessionController extends Controller
{
    /**
     * Admin sign-in is a popup on the home page; this address opens it.
     */
    public function create(Request $request): RedirectResponse
    {
        return HomeController::prompt($request, 'admin');
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        if (! $request->user()->isStaff()) {
            Auth::guard('web')->logout();

            throw ValidationException::withMessages([
                'email' => 'These credentials do not belong to an administrator account.',
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended(route('admin.dashboard', absolute: false));
    }
}
