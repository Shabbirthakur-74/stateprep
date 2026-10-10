<?php

namespace App\Models;

use App\Models\Concerns\HasCover;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A ready-made quiz built in admin. Without an exam it is a general quiz on the student Quizzes screen;
 * with an exam it is part of that exam's bundle, and only free samples can be played before buying.
 */
class Quiz extends Model
{
    use HasCover;

    protected $attributes = [
        'is_free' => true,
        'is_published' => false,
    ];

    protected $fillable = ['exam_id', 'subject_id', 'topic_id', 'title', 'description', 'is_free', 'is_published'];

    protected function casts(): array
    {
        return ['is_free' => 'boolean', 'is_published' => 'boolean'];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'quiz_question')->withPivot('position')->orderByPivot('position');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }

    public function isGeneral(): bool
    {
        return $this->exam_id === null;
    }

    /**
     * Whether students can play it now: general quizzes and free samples of a bundle. The rest of a bundle
     * unlocks with the purchase, which is not built yet.
     */
    public function isPlayable(): bool
    {
        return $this->isGeneral() || $this->is_free;
    }

    /**
     * Published quizzes with questions, whose exam (if any) is active.
     */
    public function scopeAvailable(Builder $query): void
    {
        $query->where('is_published', true)
            ->whereHas('questions')
            ->where(fn ($q) => $q->whereNull('exam_id')->orWhereHas('exam', fn ($e) => $e->where('is_active', true)));
    }
}
