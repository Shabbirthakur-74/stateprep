<?php

use App\Models\Exam;
use App\Models\User;

beforeEach(function () {
    $this->tet = Exam::create(['name' => 'HP TET (JBT)', 'is_active' => true]);
    $this->hpas = Exam::create(['name' => 'HPAS', 'is_active' => true]);
    $this->student = User::factory()->create();
});

function profileFields(array $overrides = []): array
{
    return [
        'phone' => '+91 98765-43210', 'date_of_birth' => '2002-04-15', 'district' => 'Kangra',
        'exam_ids' => [test()->tet->id], 'gender' => 'Female', 'qualification' => 'Graduate', ...$overrides,
    ];
}

test('a new student is asked for their details, with the choices to pick from', function () {
    $this->actingAs($this->student)->get('/student/dashboard')->assertInertia(fn ($page) => $page
        ->where('profilePrompt.districts.3', 'Kangra')
        ->has('profilePrompt.exams', 2)
        ->where('profilePrompt.genders', ['Male', 'Female', 'Other', 'Prefer not to say']));
});

test('signing up leads to the details form', function () {
    $this->post('/register', ['name' => 'Asha', 'email' => 'asha@example.com', 'password' => 'Password@12', 'password_confirmation' => 'Password@12'])
        ->assertRedirect('/student/dashboard');

    $this->get('/student/dashboard')->assertInertia(fn ($page) => $page->whereNot('profilePrompt', null));
});

test('saving the details stores them, tidies the phone number and stops asking', function () {
    $this->actingAs($this->student)->put('/student/profile', profileFields(['exam_ids' => [$this->tet->id, $this->hpas->id]]))
        ->assertSessionHasNoErrors();

    $profile = $this->student->profile()->first();
    expect($profile->phone)->toBe('9876543210')
        ->and($profile->district)->toBe('Kangra')
        ->and($profile->date_of_birth->toDateString())->toBe('2002-04-15')
        ->and($this->student->targetExams()->pluck('name')->sort()->values()->all())->toBe(['HP TET (JBT)', 'HPAS']);

    $this->get('/student/dashboard')->assertInertia(fn ($page) => $page->where('profilePrompt', null));
    $this->get('/student/exams')->assertInertia(fn ($page) => $page->where('targets', ['HP TET (JBT)', 'HPAS']));
});

test('gender and qualification are optional', function () {
    $this->actingAs($this->student)->put('/student/profile', profileFields(['gender' => '', 'qualification' => '']))->assertSessionHasNoErrors();

    expect($this->student->profile()->first()->gender)->toBeNull();
});

test('the details are checked with the same messages as the form', function () {
    $this->actingAs($this->student)->put('/student/profile', [
        'phone' => '12345', 'date_of_birth' => now()->addDay()->toDateString(), 'district' => 'Delhi', 'exam_ids' => [], 'gender' => 'Robot',
    ])->assertSessionHasErrors([
        'phone' => 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.',
        'date_of_birth' => 'The date of birth cannot be in the future.',
        'district' => 'Choose a district from the list.',
        'exam_ids' => 'Choose at least one exam you are preparing for.',
        'gender' => 'Choose an option from the list.',
    ]);

    $this->put('/student/profile', [])->assertSessionHasErrors([
        'phone' => 'Enter your mobile number.',
        'date_of_birth' => 'Enter your date of birth.',
        'district' => 'Choose your district.',
    ]);

    expect($this->student->profile()->exists())->toBeFalse();
});

test('hidden exams cannot be chosen', function () {
    $hidden = Exam::create(['name' => 'Old exam', 'is_active' => false]);

    $this->actingAs($this->student)->put('/student/profile', profileFields(['exam_ids' => [$hidden->id]]))
        ->assertSessionHasErrors(['exam_ids.0' => 'Choose exams from the list.']);
});

test('without any exams on the site, students are not stuck on the form', function () {
    Exam::query()->delete();

    $this->actingAs($this->student)->put('/student/profile', profileFields(['exam_ids' => []]))->assertSessionHasNoErrors();
});

test('admins see the details on the student page', function () {
    $this->actingAs($this->student)->put('/student/profile', profileFields());

    $this->actingAs(User::factory()->superAdmin()->create())->get("/admin/students/{$this->student->id}")->assertInertia(fn ($page) => $page
        ->where('profile.phone', '9876543210')
        ->where('profile.district', 'Kangra')
        ->where('exams.0.name', 'HP TET (JBT)'));
});

test('team members are never asked for student details', function () {
    $this->actingAs(User::factory()->superAdmin()->create())->get('/admin/dashboard')->assertInertia(fn ($page) => $page->where('profilePrompt', null));
});

test('the settings page shows the saved details for editing', function () {
    $this->actingAs($this->student)->put('/student/profile', profileFields(['exam_ids' => [$this->tet->id, $this->hpas->id]]));
    // An exam taken off the site is not offered again, so it cannot block saving.
    $this->hpas->update(['is_active' => false]);

    $this->get('/student/settings')->assertOk()->assertInertia(fn ($page) => $page
        ->component('student/settings')
        ->where('account.email', $this->student->email)
        ->where('profile.phone', '9876543210')
        ->where('profile.date_of_birth', '2002-04-15')
        ->where('profile.exam_ids', [$this->tet->id])
        ->where('profile.gender', 'Female')
        ->where('profilePrompt', null));
});

test('details can be changed later, with the same checks', function () {
    $this->actingAs($this->student)->put('/student/profile', profileFields());

    $this->put('/student/profile', profileFields(['phone' => '7012345678', 'district' => 'Shimla', 'exam_ids' => [$this->hpas->id], 'gender' => '']))
        ->assertSessionHas('status', 'Your details are saved.');

    $profile = $this->student->profile()->first();
    expect($profile->phone)->toBe('7012345678')
        ->and($profile->district)->toBe('Shimla')
        ->and($profile->gender)->toBeNull()
        ->and($this->student->targetExams()->pluck('name')->all())->toBe(['HPAS'])
        ->and($this->student->profile()->count())->toBe(1);

    $this->put('/student/profile', profileFields(['phone' => '12345']))
        ->assertSessionHasErrors(['phone' => 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.']);
    expect($this->student->profile()->first()->phone)->toBe('7012345678');
});
