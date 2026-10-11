<?php

namespace App\Services;

use App\Models\Doubt;
use App\Models\DoubtReply;
use App\Models\Question;
use Illuminate\Support\Str;

/**
 * Shapes doubts for the student and admin screens: a summary for lists and the full conversation.
 */
class DoubtPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function summary(Doubt $doubt): array
    {
        return [
            'id' => $doubt->id,
            'preview' => Str::limit(preg_replace('/\s+/', ' ', $doubt->body), 140),
            'status' => $doubt->status,
            'subject' => $doubt->subject?->name,
            'topic' => $doubt->topic?->name,
            'student' => $doubt->user?->name,
            'replies_count' => $doubt->replies_count ?? $doubt->replies()->count(),
            'has_photo' => $doubt->image_path !== null,
            'has_question' => $doubt->question_id !== null,
            'created_at' => $doubt->created_at->toIso8601String(),
            'last_activity_at' => $doubt->last_activity_at->toIso8601String(),
        ];
    }

    /**
     * The doubt with its attached question, photo and replies in order.
     *
     * @return array<string, mixed>
     */
    public static function thread(Doubt $doubt): array
    {
        $doubt->loadMissing('user:id,name', 'subject:id,name', 'topic:id,name', 'question', 'replies.user:id,name,role');

        return [
            ...self::summary($doubt),
            'body' => $doubt->body,
            'student_id' => $doubt->user_id,
            'photo_url' => $doubt->image_path ? route('doubts.image', $doubt) : null,
            'question' => $doubt->question ? self::question($doubt->question) : null,
            'replies' => $doubt->replies->map(fn (DoubtReply $reply) => [
                'id' => $reply->id,
                'body' => $reply->body,
                'from_team' => $reply->user_id !== $doubt->user_id,
                'author' => $reply->user_id === $doubt->user_id ? $doubt->user->name : ($reply->user?->name ?? 'StatePrep360 team'),
                'photo_url' => $reply->image_path ? route('doubts.reply-image', $reply) : null,
                'created_at' => $reply->created_at->toIso8601String(),
            ])->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function question(Question $question): array
    {
        $question->loadMissing('subject:id,name', 'topic:id,name');

        return [
            'id' => $question->id,
            'text' => $question->text,
            'options' => array_combine(Question::OPTIONS, $question->options()),
            'correct' => $question->correct_option,
            'explanation' => $question->explanation,
            'subject_id' => $question->subject_id,
            'topic_id' => $question->topic_id,
            'subject' => $question->subject?->name,
            'topic' => $question->topic?->name,
        ];
    }
}
