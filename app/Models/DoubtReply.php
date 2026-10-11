<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * One message in a doubt's conversation, from the student or a team member.
 */
class DoubtReply extends Model
{
    protected $fillable = ['user_id', 'body', 'image_path'];

    protected static function booted(): void
    {
        static::deleted(function (DoubtReply $reply) {
            if ($reply->image_path) {
                Storage::disk(Doubt::DISK)->delete($reply->image_path);
            }
        });
    }

    public function doubt(): BelongsTo
    {
        return $this->belongsTo(Doubt::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
