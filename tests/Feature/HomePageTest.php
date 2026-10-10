<?php

use App\Models\User;

test('guests see the home page with the notice board', function () {
    $this->get('/')->assertOk()->assertInertia(fn ($page) => $page
        ->component('welcome')
        ->has('notices'));
});

test('admins can view the home page', function () {
    $this->actingAs(User::factory()->superAdmin()->create())->get('/')->assertOk();
});

test('signed-in students are sent from the home page to their dashboard', function () {
    $this->actingAs(User::factory()->create())->get('/')->assertRedirect('/student/dashboard');
});

test('the legal pages load', function (string $url, string $page) {
    $this->get($url)->assertOk()->assertInertia(fn ($p) => $p->component('legal')->where('page', $page));
})->with([
    ['/terms', 'terms'],
    ['/privacy', 'privacy'],
    ['/user-policy', 'user-policy'],
]);
