<?php

namespace App\Models;

use App\Models\Concerns\HasCover;
use App\Models\Concerns\HasHomeCards;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A timed paper built from the question bank: either a mock test or a previous year paper.
 */
class MockTest extends Model
{
    use HasCover, HasHomeCards;

    public const TYPES = ['mock', 'pyq'];

    // Same defaults as the table, so a freshly created model behaves like one loaded from the database.
    protected $attributes = [
        'type' => 'mock',
        'is_free' => true,
        'is_published' => false,
        'marks_per_question' => 1,
        'negative_marks' => 0,
    ];

    protected $fillable = [
        'exam_id', 'title', 'type', 'year', 'is_free', 'price',
        'duration_minutes', 'marks_per_question', 'negative_marks', 'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'is_free' => 'boolean',
            'price' => 'float',
            'marks_per_question' => 'float',
            'negative_marks' => 'float',
        ];
    }

    public function isPaid(): bool
    {
        return ! $this->is_free;
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function series(): BelongsToMany
    {
        return $this->belongsToMany(TestSeries::class);
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'mock_test_question')
            ->withPivot('position')
            ->orderByPivot('position');
    }
}
