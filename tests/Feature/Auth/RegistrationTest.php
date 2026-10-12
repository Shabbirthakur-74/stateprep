<?php

test('the registration address opens the sign-up sidebar on the home page', function () {
    $this->get('/register')->assertRedirect('/?auth=register');
    $this->get('/?auth=register')->assertOk()->assertInertia(fn ($page) => $page->where('authPrompt', 'register'));
});

test('new users can register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'Password@12',
        'password_confirmation' => 'Password@12',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('student.dashboard', absolute: false));
});
