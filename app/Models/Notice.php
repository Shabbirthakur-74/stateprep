<?php

namespace App\Models;

use App\Enums\NoticeCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notice extends Model
{
    /** Notices this many days old or newer are flagged "New" on the board. */
    public const NEW_FOR_DAYS = 7;

    protected $fillable = ['exam_id', 'category', 'title', 'summary', 'url', 'published_on', 'is_pinned', 'is_published'];

    protected function casts(): array
    {
        return [
            'category' => NoticeCategory::class,
            'published_on' => 'date',
            'is_pinned' => 'boolean',
            'is_published' => 'boolean',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true)->whereDate('published_on', '<=', now());
    }

    /**
     * The notices shown on the board, pinned first, then newest first, shaped for the NoticeBoard component.
     * With an exam, only that exam's notices.
     *
     * @return list<array<string, mixed>>
     */
    public static function board(int $limit = 12, ?int $examId = null): array
    {
        return static::published()
            ->when($examId, fn ($q) => $q->where('exam_id', $examId))
            ->with('exam:id,name')
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_on')
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (Notice $notice) => [
                'id' => $notice->id,
                'title' => $notice->title,
                'summary' => $notice->summary,
                'url' => $notice->url,
                'category' => $notice->category->value,
                'categoryLabel' => $notice->category->label(),
                'exam' => $notice->exam?->name,
                'publishedOn' => $notice->published_on->toDateString(),
                'isPinned' => $notice->is_pinned,
                'isNew' => $notice->published_on->gte(today()->subDays(self::NEW_FOR_DAYS)),
            ])
            ->all();
    }
}
