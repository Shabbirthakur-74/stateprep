<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/settings', ['bands' => Setting::resultBands()]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pass_percent' => ['required', 'integer', 'between:1,100'],
            'review_percent' => ['required', 'integer', 'between:0,100', 'lt:pass_percent'],
        ], ['review_percent.lt' => 'The review cut-off must be lower than the pass cut-off.']);

        Setting::put($data);

        return back()->with('status', 'Settings saved.');
    }
}
