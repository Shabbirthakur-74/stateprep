<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\Storage;

/**
 * A cover photo kept on the public disk under covers/. The file is removed with the record.
 */
trait HasCover
{
    protected static function bootHasCover(): void
    {
        // A block body: an arrow function would return false when there is no cover, which stops later "deleted" listeners.
        static::deleted(function ($model) {
            if ($model->cover_path) {
                Storage::disk('public')->delete($model->cover_path);
            }
        });
    }

    public function coverUrl(): ?string
    {
        return $this->cover_path ? asset('storage/'.$this->cover_path) : null;
    }
}
