<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A card in one of the homepage carousels. It points at a test series, mock test / PYQ or study material and
 * adds homepage-only extras: a badge, up to three highlight chips and a short tag line.
 */
class HomeCard extends Model
{
    public const SECTIONS = ['tests', 'materials'];

    public const BADGES = ['Bestseller', 'Most Popular', 'Trending', 'New'];

    /** What each carousel can show, by morph alias. */
    public const TYPES = [
        'tests' => ['test_series', 'mock_test'],
        'materials' => ['study_material'],
    ];

    protected $fillable = ['section', 'cardable_type', 'cardable_id', 'badge', 'highlights', 'tag', 'position'];

    protected function casts(): array
    {
        return ['highlights' => 'array'];
    }

    public function cardable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Cards of a section in their order, with the item and its exam loaded.
     */
    public static function forSection(string $section)
    {
        return self::where('section', $section)
            ->orderBy('position')
            ->orderBy('id')
            ->with(['cardable' => fn (MorphTo $morph) => $morph->morphWith([
                TestSeries::class => ['exam'],
                MockTest::class => ['exam'],
                StudyMaterial::class => ['exam'],
            ])])
            ->get();
    }
}
