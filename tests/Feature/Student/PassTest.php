<?php

use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\Setting;
use App\Models\Subject;
use App\Models\User;

test('the pass page offers monthly and yearly plans and counts all the content they give access to', function () {
    $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
    $question = Question::create([
        'subject_id' => Subject::create(['name' => 'GK'])->id, 'text' => 'Q', 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd',
        'correct_option' => 'A', 'difficulty' => 'easy',
    ]);
    foreach ([['Paid mock', false], ['Free mock', true]] as [$title, $free]) {
        MockTest::create(['exam_id' => $exam->id, 'title' => $title, 'duration_minutes' => 30, 'is_published' => true, 'is_free' => $free, 'price' => $free ? null : 49])
            ->questions()->attach($question->id, ['position' => 1]);
    }

    $this->actingAs(User::factory()->create())->get('/student/pass')->assertOk()->assertInertia(fn ($page) => $page
        ->component('student/pass')
        ->where('plans.0.id', 'monthly')
        ->where('plans.0.price', 199)
        ->where('plans.1.id', 'yearly')
        ->where('plans.1.price', 1499)
        ->where('plans.1.original_price', 2388)
        ->where('plans.1.saving_percent', 37)
        ->where('counts.exams', 1)
        // Everything published counts, free and paid.
        ->where('counts.mocks', 2)
        ->where('counts.questions', 1)
        ->where('counts.subjects', 1));
});

test('choosing a plan opens its payment page', function (string $plan, int $price) {
    $this->actingAs(User::factory()->create())->get("/student/pass/checkout/{$plan}")->assertOk()->assertInertia(fn ($page) => $page
        ->component('student/pass-checkout')
        ->where('plan.id', $plan)
        ->where('plan.price', $price));
})->with([['monthly', 199], ['yearly', 1499]]);

test('unknown plans and plans without a price have no payment page', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/student/pass/checkout/weekly')->assertNotFound();

    Setting::put(['pass_monthly_price' => '']);
    $this->get('/student/pass/checkout/monthly')->assertNotFound();
    $this->get('/student/pass')->assertInertia(fn ($page) => $page->has('plans', 1)->where('plans.0.id', 'yearly'));
});

test('admins set the pass prices in settings', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->put('/admin/settings', [
        'pass_percent' => 60, 'review_percent' => 40,
        'pass_monthly_price' => 249, 'pass_monthly_original' => '', 'pass_yearly_price' => 1999, 'pass_yearly_original' => 2999,
    ])->assertSessionHasNoErrors();

    expect(collect(Setting::passPlans())->pluck('price', 'id')->all())->toBe(['monthly' => 249.0, 'yearly' => 1999.0])
        ->and(Setting::passPlans()[0]['original_price'])->toBeNull();

    $this->put('/admin/settings', ['pass_percent' => 60, 'review_percent' => 40, 'pass_yearly_price' => 1999, 'pass_yearly_original' => 999])
        ->assertSessionHasErrors('pass_yearly_original');
});

test('team members and visitors cannot open the pass pages', function () {
    $this->get('/student/pass')->assertRedirect();
    $this->actingAs(User::factory()->superAdmin()->create())->get('/student/pass')->assertForbidden();
});
