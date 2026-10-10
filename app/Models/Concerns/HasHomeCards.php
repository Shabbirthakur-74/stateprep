<?php

namespace App\Models\Concerns;

use App\Models\HomeCard;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Content that can be featured in a homepage carousel. Its cards go when it is deleted.
 */
trait HasHomeCards
{
    protected static function bootHasHomeCards(): void
    {
        static::deleted(function ($model) {
            $model->homeCards()->delete();
        });
    }

    public function homeCards(): MorphMany
    {
        return $this->morphMany(HomeCard::class, 'cardable');
    }
}
