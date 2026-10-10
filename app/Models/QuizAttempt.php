<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One run of a quiz by a student: a topic, mixed or random quiz they built, or a ready-made quiz from admin ("set").
 */
class QuizAttempt extends Model
{
    public const TOPIC = 'topic';

    public const MIXED = 'mixed';

    public const RANDOM = 'random';

    /** A ready-made quiz made in admin. */
    public const SET = 'set';

    /** Quizzes a student builds on the Quizzes screen. */
    public const MODES = [self::TOPIC, self::MIXED, self::RANDOM];

    protected $fillable = ['mode', 'subject_id', 'topic_id', 'quiz_id', 'title', 'total_questions'];

    protected function casts(): array
    {
        return ['submitted_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(QuizAttemptAnswer::class)->orderBy('position');
    }

    public function scopeSubmitted(Builder $query): void
    {
        $query->whereNotNull('submitted_at');
    }

    public function isSubmitted(): bool
    {
        return $this->submitted_at !== null;
    }

    /** Correct answers as a percentage of all questions, or null before submission. */
    public function percent(): ?float
    {
        return $this->isSubmitted() && $this->total_questions > 0 ? round($this->correct_count * 100 / $this->total_questions, 1) : null;
    }

    /** Seconds from start to submission. */
    public function durationSeconds(): ?int
    {
        return $this->isSubmitted() ? (int) $this->created_at->diffInSeconds($this->submitted_at, true) : null;
    }
}
