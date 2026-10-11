<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * A student's doubt. Open while it waits for the team, answered once the team replies, closed when resolved.
 * A student reply opens it again.
 */
class Doubt extends Model
{
    public const OPEN = 'open';

    public const ANSWERED = 'answered';

    public const CLOSED = 'closed';

    public const STATUSES = [self::OPEN, self::ANSWERED, self::CLOSED];

    /** Where photos are kept: the private disk, served only to the student and the team. */
    public const DISK = 'local';

    protected $attributes = ['status' => self::OPEN];

    protected $fillable = ['subject_id', 'topic_id', 'question_id', 'body', 'image_path', 'status', 'last_activity_at', 'student_seen_at'];

    protected function casts(): array
    {
        return ['last_activity_at' => 'datetime', 'student_seen_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(function (Doubt $doubt) {
            $doubt->last_activity_at ??= now();
            $doubt->student_seen_at ??= now();
        });

        // Block bodies: a listener returning false would stop the ones after it.
        static::deleting(function (Doubt $doubt) {
            $doubt->replies()->get()->each->delete();
        });
        static::deleted(function (Doubt $doubt) {
            if ($doubt->image_path) {
                Storage::disk(self::DISK)->delete($doubt->image_path);
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    public function replies(): HasMany
    {
        return $this->hasMany(DoubtReply::class)->oldest('id');
    }

    /**
     * Doubts with a team reply the student has not opened yet.
     */
    public function scopeUnreadByStudent(Builder $query): void
    {
        $query->whereHas('replies', fn ($q) => $q
            // A team reply: anyone but the student (also a reply whose team member account was removed).
            ->where(fn ($r) => $r->whereNull('doubt_replies.user_id')->orWhereColumn('doubt_replies.user_id', '!=', 'doubts.user_id'))
            ->whereColumn('doubt_replies.created_at', '>', 'doubts.student_seen_at'));
    }

    /**
     * Records a reply and moves the doubt along: a team reply answers it, a student reply opens it again.
     */
    public function addReply(User $author, string $body, ?string $imagePath = null): DoubtReply
    {
        $reply = $this->replies()->create(['user_id' => $author->id, 'body' => $body, 'image_path' => $imagePath]);
        $fromStudent = $author->id === $this->user_id;

        $this->forceFill([
            'status' => $fromStudent ? self::OPEN : self::ANSWERED,
            'last_activity_at' => now(),
            'student_seen_at' => $fromStudent ? now() : $this->student_seen_at,
        ])->save();

        return $reply;
    }
}
