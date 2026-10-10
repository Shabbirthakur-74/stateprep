<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A subject in the shared question bank, e.g. "Himachal Pradesh GK". Exams link to the subjects they cover.
 */
class Subject extends Model
{
    protected $fillable = ['name'];

    public function exams(): BelongsToMany
    {
        return $this->belongsToMany(Exam::class);
    }

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class)->orderBy('position')->orderBy('name');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }
}
