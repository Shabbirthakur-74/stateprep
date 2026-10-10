<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ShowAlreadySignedIn
{
    /**
     * Instead of redirecting signed-in users away from login/register, tell them who they are
     * signed in as and let them continue or log out to switch accounts.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()) {
            return Inertia::render('auth/already-signed-in', [
                'dashboardUrl' => route($request->user()->dashboardRoute()),
                // Login page the visitor was trying to reach; used as the post-logout destination.
                'next' => $request->route()->getName(),
            ])->toResponse($request);
        }

        return $next($request);
    }
}
