<?php

namespace App\Http\Controllers;

use App\Models\Notice;
use App\Models\Setting;
use App\Services\PublicCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The landing page: exams covered, the notice board and the test series and study material carousels, all managed in admin.
 */
class HomeController extends Controller
{
    public function __invoke(Request $request): Response|RedirectResponse
    {
        // Signed-in students work from their dashboard.
        if ($request->user()?->isStudent()) {
            return to_route('student.dashboard');
        }

        return Inertia::render('welcome', [
            'notices' => Notice::board(),
            'exams' => PublicCatalog::homeExams(),
            'testCards' => PublicCatalog::homeCards('tests'),
            'materialCards' => PublicCatalog::homeCards('materials'),
            'text' => Setting::homepageText(),
            ...self::publicProps($request),
        ]);
    }

    public const PROMPTS = ['login', 'register', 'admin'];

    /**
     * Login, sign-up and admin sign-in have no pages of their own: their addresses open the matching
     * sidebar or popup on the home page. Messages flashed for the next page are carried along.
     */
    public static function prompt(Request $request, string $mode): RedirectResponse
    {
        $request->session()->reflash();

        return to_route('home', ['auth' => $mode]);
    }

    /**
     * Props every public page needs for its login / sign-up sidebar.
     *
     * @return array<string, mixed>
     */
    public static function publicProps(Request $request): array
    {
        return [
            // Which sidebar or popup to open straight away, e.g. after being sent to /login.
            'authPrompt' => ! $request->user() && in_array($request->query('auth'), self::PROMPTS, true) ? $request->query('auth') : null,
        ];
    }
}
