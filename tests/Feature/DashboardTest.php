<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
    $this->get('/student/dashboard')->assertRedirect('/login');
    $this->get('/admin/dashboard')->assertRedirect('/login');
});

test('the generic dashboard route sends each role to its own dashboard', function () {
    $this->actingAs(User::factory()->create())->get('/dashboard')->assertRedirect('/student/dashboard');
    $this->actingAs(User::factory()->superAdmin()->create())->get('/dashboard')->assertRedirect('/admin/dashboard');
});

test('students can open the student dashboard but not the admin dashboard', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/student/dashboard')->assertOk();
    $this->get('/admin/dashboard')->assertForbidden();
});

test('admins can open the admin dashboard but not the student dashboard', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->get('/admin/dashboard')->assertOk();
    $this->get('/student/dashboard')->assertForbidden();
});

test('logged in users visiting a login page see who they are signed in as', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    foreach (['/login', '/register', '/admin/login'] as $url) {
        $this->get($url)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('auth/already-signed-in')
                ->where('dashboardUrl', url('/admin/dashboard'))
                ->where('next', ltrim($url, '/') === 'admin/login' ? 'admin.login' : ltrim($url, '/')));
    }
});

test('logging out from the popup lands on the requested login page', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/logout', ['next' => 'admin.login'])->assertRedirect(route('admin.login'));
    $this->assertGuest();
});

test('logout ignores an unknown redirect target', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/logout', ['next' => 'https://evil.example'])->assertRedirect('/');
});

test('logged in users cannot post to the login form', function () {
    $this->actingAs($user = User::factory()->create())
        ->post('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertRedirect('/student/dashboard');
});
