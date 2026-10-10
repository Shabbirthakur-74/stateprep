<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One timed run of a mock test or previous year paper.
 */
class TestAttempt extends Model
{
    protected $fillable = [
        'mock_test_id', 'test_series_id', 'type', 'title', 'ends_at', 'total_questions',
        'marks_per_question', 'negative_marks', 'max_score',
    ];

    protected function casts(): array
    {
        return [
            'ends_at' => 'datetime',
            'submitted_at' => 'datetime',
            'marks_per_question' => 'float',
            'negative_marks' => 'float',
            'max_score' => 'float',
            'score' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function mockTest(): BelongsTo
    {
        return $this->belongsTo(MockTest::class);
    }

    public function series(): BelongsTo
    {
        return $this->belongsTo(TestSeries::class, 'test_series_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(TestAttemptAnswer::class)->orderBy('position');
    }

    public function scopeSubmitted(Builder $query): void
    {
        $query->whereNotNull('submitted_at');
    }

    public function isSubmitted(): bool
    {
        return $this->submitted_at !== null;
    }

    public function hasExpired(): bool
    {
        return ! $this->isSubmitted() && $this->ends_at->isPast();
    }

    /** Score as a percentage of the maximum, never below zero; null until submitted. */
    public function percent(): ?float
    {
        return $this->isSubmitted() && $this->max_score > 0 ? max(0, round($this->score * 100 / $this->max_score, 1)) : null;
    }

    public function durationSeconds(): ?int
    {
        return $this->isSubmitted() ? (int) $this->created_at->diffInSeconds(min($this->submitted_at, $this->ends_at), true) : null;
    }
}
