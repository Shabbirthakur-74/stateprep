<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\StudentProfile;
use App\Rules\DateOfBirth;
use App\Rules\IndianMobile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The details a student fills in right after signing up, and can change later under Settings: mobile number, date of
 * birth, district, the exams they are preparing for, and optionally gender and qualification. The same checks and messages run in the browser
 * (resources/js/lib/profile-validation.ts).
 */
class ProfileController extends Controller
{
    /**
     * Settings: the account and the details given after sign-up, which can be changed here at any time.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $profile = $user->profile;
        $options = StudentProfile::options();

        return Inertia::render('student/settings', [
            'account' => [...$user->only('name', 'email'), 'joined' => $user->created_at->toDateString()],
            'options' => $options,
            'profile' => $profile ? [
                'phone' => $profile->phone,
                'date_of_birth' => $profile->date_of_birth->toDateString(),
                'district' => $profile->district,
                // Only exams still on offer; a hidden one could not be saved again.
                'exam_ids' => $user->targetExams()->whereIn('exams.id', $options['exams']->pluck('id'))->pluck('exams.id'),
                'gender' => $profile->gender ?? '',
                'qualification' => $profile->qualification ?? '',
            ] : null,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'phone' => [new IndianMobile],
            'date_of_birth' => [new DateOfBirth],
            'district' => ['required', Rule::in(StudentProfile::DISTRICTS)],
            // Required whenever there are exams to choose from, so a new site without exams never traps a student here.
            'exam_ids' => Exam::where('is_active', true)->exists() ? ['required', 'array', 'min:1'] : ['nullable', 'array'],
            'exam_ids.*' => ['integer', Rule::exists('exams', 'id')->where('is_active', true)],
            'gender' => ['nullable', Rule::in(StudentProfile::GENDERS)],
            'qualification' => ['nullable', Rule::in(StudentProfile::QUALIFICATIONS)],
        ], [
            'district.required' => 'Choose your district.',
            'district.in' => 'Choose a district from the list.',
            'exam_ids.required' => 'Choose at least one exam you are preparing for.',
            'exam_ids.min' => 'Choose at least one exam you are preparing for.',
            'exam_ids.*' => 'Choose exams from the list.',
            'gender.in' => 'Choose an option from the list.',
            'qualification.in' => 'Choose an option from the list.',
        ]);

        $first = $user->profile()->doesntExist();
        $user->profile()->updateOrCreate([], [
            'phone' => IndianMobile::normalize($data['phone']),
            'date_of_birth' => $data['date_of_birth'],
            'district' => $data['district'],
            'gender' => $data['gender'] ?? null,
            'qualification' => $data['qualification'] ?? null,
        ]);
        $user->targetExams()->sync($data['exam_ids'] ?? []);

        return back()->with('status', $first ? 'Thanks! Your details are saved. You can change them any time under Settings.' : 'Your details are saved.');
    }
}
