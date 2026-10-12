<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Details a student gives right after signing up. The exams they prepare for are on User::targetExams().
 */
class StudentProfile extends Model
{
    /** Himachal Pradesh's districts, plus a choice for students elsewhere. */
    public const DISTRICTS = [
        'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una',
        'Outside Himachal Pradesh',
    ];

    public const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

    public const QUALIFICATIONS = ['10th pass', '12th pass', 'Diploma', 'Graduate', 'Post-graduate', 'Other'];

    protected $fillable = ['phone', 'date_of_birth', 'gender', 'district', 'qualification'];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The choices the form offers, sent to the browser so both sides use the same lists.
     *
     * @return array<string, mixed>
     */
    public static function options(): array
    {
        return [
            'districts' => self::DISTRICTS,
            'genders' => self::GENDERS,
            'qualifications' => self::QUALIFICATIONS,
            'exams' => Exam::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ];
    }
}
