<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\PublicCatalog;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The StatePrep360 Pass: a monthly or yearly pass to all paid content of every exam. Prices are set in admin
 * Settings. Buying leads to the payment page; the payment step itself is not connected yet.
 */
class PassController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('student/pass', [
            'plans' => Setting::passPlans(),
            'counts' => PublicCatalog::passCounts(),
        ]);
    }

    public function checkout(string $plan): Response
    {
        $chosen = collect(Setting::passPlans())->firstWhere('id', $plan);
        abort_unless($chosen, 404);

        return Inertia::render('student/pass-checkout', [
            'plan' => $chosen,
            'counts' => PublicCatalog::passCounts(),
        ]);
    }
}
