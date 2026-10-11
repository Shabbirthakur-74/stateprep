<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Site-wide key/value settings edited in the admin area.
 */
class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    /** Every setting with its default. */
    public const DEFAULTS = [
        'pass_percent' => 60,
        'review_percent' => 40,
        'home_exams_title' => 'Exams We Cover',
        'home_exams_description' => 'Choose from a wide range of state level exams.',
        'home_tests_eyebrow' => 'Curated Mock Exam Series',
        'home_tests_title' => 'Mocks / Test Series',
        'home_tests_description' => 'Take topic-wise and full-length mock tests designed precisely on Himachal exam patterns.',
        'home_materials_eyebrow' => 'Curated Revision & Notes',
        'home_materials_title' => 'Study Material & Notes',
        'home_materials_description' => 'Subject-wise notes, high-yield revision summaries, and state GK dossiers crafted by top exam educators.',
        // StatePrep360 Pass: all paid content of every exam. An empty price hides that plan.
        'pass_monthly_price' => 199,
        'pass_monthly_original' => null,
        'pass_yearly_price' => 1499,
        'pass_yearly_original' => 2388,
    ];

    /** The pass plans: settings prefix, name and how many months each one lasts. */
    public const PASS_PLANS = [
        'monthly' => ['name' => 'Monthly Pass', 'months' => 1],
        'yearly' => ['name' => 'Yearly Pass', 'months' => 12],
    ];

    /** Headings of the homepage sections, editable under Homepage in the admin area. */
    public const HOMEPAGE_TEXT = [
        'home_exams_title', 'home_exams_description',
        'home_tests_eyebrow', 'home_tests_title', 'home_tests_description',
        'home_materials_eyebrow', 'home_materials_title', 'home_materials_description',
    ];

    public static function get(string $key): mixed
    {
        $all = Cache::rememberForever('settings', fn () => static::pluck('value', 'key')->all());

        return $all[$key] ?? self::DEFAULTS[$key] ?? null;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            static::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        Cache::forget('settings');
    }

    /**
     * Pass plans that have a price, with what they work out to per month and how much the yearly plan saves
     * against paying monthly for a year.
     *
     * @return list<array{id: string, name: string, months: int, price: float, original_price: float|null, per_month: float, saving_percent: int}>
     */
    public static function passPlans(): array
    {
        $price = fn (string $key) => (float) static::get($key) ?: null;
        $monthly = $price('pass_monthly_price');

        return collect(self::PASS_PLANS)
            ->map(function (array $plan, string $id) use ($price, $monthly) {
                $amount = $price("pass_{$id}_price");
                $original = $price("pass_{$id}_original");

                return $amount ? [
                    'id' => $id,
                    'name' => $plan['name'],
                    'months' => $plan['months'],
                    'price' => $amount,
                    'original_price' => $original > $amount ? $original : null,
                    'per_month' => round($amount / $plan['months'], 2),
                    'saving_percent' => $monthly && $plan['months'] > 1 ? max(0, (int) round((1 - $amount / ($monthly * $plan['months'])) * 100)) : 0,
                ] : null;
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    public static function homepageText(): array
    {
        return collect(self::HOMEPAGE_TEXT)->mapWithKeys(fn ($key) => [$key => (string) static::get($key)])->all();
    }

    /**
     * Score bands used to label results: Passed at or above pass_percent, Review at or above review_percent, otherwise Retry.
     *
     * @return array{pass: int, review: int}
     */
    public static function resultBands(): array
    {
        return ['pass' => (int) static::get('pass_percent'), 'review' => (int) static::get('review_percent')];
    }
}
