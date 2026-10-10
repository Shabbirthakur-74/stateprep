<?php

use App\Models\User;

test('the admin login address opens the admin popup on the home page', function () {
    $this->get('/admin/login')->assertRedirect('/?auth=admin');
    $this->get('/?auth=admin')->assertOk()->assertInertia(fn ($page) => $page->where('authPrompt', 'admin'));
    $this->get('/?auth=nonsense')->assertInertia(fn ($page) => $page->where('authPrompt', null));
});

test('admins can log in through the admin portal', function () {
    $admin = User::factory()->superAdmin()->create();

    $this->post('/admin/login', ['email' => $admin->email, 'password' => 'password'])
        ->assertRedirect(route('admin.dashboard', absolute: false));

    $this->assertAuthenticatedAs($admin);
});

test('students are rejected by the admin portal', function () {
    $student = User::factory()->create();

    $this->post('/admin/login', ['email' => $student->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('admins logging in at the student login are sent to the admin dashboard', function () {
    $admin = User::factory()->superAdmin()->create();

    $this->post('/login', ['email' => $admin->email, 'password' => 'password'])
        ->assertRedirect(route('admin.dashboard', absolute: false));
});

test('registration always creates a student even if a role is submitted', function () {
    $this->post('/register', [
        'name' => 'Sneaky',
        'email' => 'sneaky@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'admin',
    ]);

    expect(User::where('email', 'sneaky@example.com')->first()->isStudent())->toBeTrue();
});
