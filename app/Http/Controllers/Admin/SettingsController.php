<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Site-wide settings: result cut-offs and StatePrep360 Pass prices.
 */
class SettingsController extends Controller
{
    private const PASS_KEYS = ['pass_monthly_price', 'pass_monthly_original', 'pass_yearly_price', 'pass_yearly_original'];

    public function edit(): Response
    {
        return Inertia::render('admin/settings', [
            'bands' => Setting::resultBands(),
            'pass' => collect(self::PASS_KEYS)->mapWithKeys(fn ($key) => [$key => (string) Setting::get($key)])->all(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pass_percent' => ['required', 'integer', 'between:1,100'],
            'review_percent' => ['required', 'integer', 'between:0,100', 'lt:pass_percent'],
            'pass_monthly_price' => ['nullable', 'numeric', 'min:1', 'max:99999'],
            'pass_monthly_original' => ['nullable', 'numeric', 'max:99999', Rule::when($request->filled('pass_monthly_price'), 'gte:pass_monthly_price')],
            'pass_yearly_price' => ['nullable', 'numeric', 'min:1', 'max:99999'],
            'pass_yearly_original' => ['nullable', 'numeric', 'max:99999', Rule::when($request->filled('pass_yearly_price'), 'gte:pass_yearly_price')],
        ], [
            'review_percent.lt' => 'The review cut-off must be lower than the pass cut-off.',
            'pass_monthly_original.gte' => 'The original price must not be lower than the price.',
            'pass_yearly_original.gte' => 'The original price must not be lower than the price.',
        ]);

        // A cleared price is stored as empty, which hides that plan (null would fall back to the default price).
        Setting::put(array_map(fn ($value) => $value ?? '', $data));

        return back()->with('status', 'Settings saved.');
    }
}
