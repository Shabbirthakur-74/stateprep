<?php

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\User;

test('super admins can open every admin section', function (string $url) {
    $this->actingAs(User::factory()->superAdmin()->create())->get($url)->assertOk();
})->with([
    '/admin/team', '/admin/team/create', '/admin/exams', '/admin/subjects', '/admin/questions', '/admin/questions/import',
    '/admin/mock-tests', '/admin/test-series', '/admin/materials', '/admin/homepage', '/admin/doubts', '/admin/notices', '/admin/students', '/admin/settings',
]);

test('team members only reach the sections they were given', function () {
    $this->actingAs(User::factory()->staff([Permission::Questions])->create());

    $this->get('/admin/dashboard')->assertOk();
    $this->get('/admin/questions')->assertOk();
    $this->get('/admin/subjects')->assertOk();
    $this->get('/admin/mock-tests')->assertForbidden();
    $this->get('/admin/students')->assertForbidden();
    $this->get('/admin/settings')->assertForbidden();
    $this->get('/admin/team')->assertForbidden();
});

test('the shared user data lists the sections a member can use', function () {
    $this->actingAs(User::factory()->staff([Permission::Notices, Permission::Students])->create())
        ->get('/admin/dashboard')
        ->assertInertia(fn ($page) => $page->where('auth.user.permissions', ['manage-notices', 'manage-students']));
});

test('a super admin can add a team member with chosen access', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->post('/admin/team', [
        'name' => 'Content Editor', 'email' => 'editor@example.com', 'password' => 'Secret-pass-123',
        'role' => 'staff', 'permissions' => ['manage-questions', 'manage-tests'],
    ])->assertRedirect('/admin/team');

    $member = User::where('email', 'editor@example.com')->first();
    expect($member->role)->toBe(Role::Staff)
        ->and($member->hasPermission(Permission::Questions))->toBeTrue()
        ->and($member->hasPermission(Permission::Students))->toBeFalse();

    // The new member can sign in through the admin login.
    auth()->logout();
    $this->post('/admin/login', ['email' => 'editor@example.com', 'password' => 'Secret-pass-123'])->assertRedirect('/admin/dashboard');
});

test('a super admin can change what a member can access', function () {
    $this->actingAs(User::factory()->superAdmin()->create());
    $member = User::factory()->staff([Permission::Questions])->create();

    $this->put("/admin/team/{$member->id}", ['name' => $member->name, 'email' => $member->email, 'role' => 'staff', 'permissions' => ['manage-students']])
        ->assertRedirect('/admin/team');

    expect($member->fresh()->grantedPermissions())->toBe([Permission::Students]);
});

test('super admins cannot demote or delete themselves', function () {
    $this->actingAs($me = User::factory()->superAdmin()->create());

    $this->put("/admin/team/{$me->id}", ['name' => $me->name, 'email' => $me->email, 'role' => 'staff', 'permissions' => []]);
    expect($me->fresh()->isSuperAdmin())->toBeTrue();

    $this->delete("/admin/team/{$me->id}")->assertSessionHasErrors('member');
    expect($me->fresh())->not->toBeNull();
});

test('team members cannot manage the team, even with every section', function () {
    $this->actingAs(User::factory()->staff()->create());

    $this->post('/admin/team', ['name' => 'X', 'email' => 'x@example.com', 'password' => 'Secret-pass-123', 'role' => 'super_admin'])->assertForbidden();
});

test('the team pages never edit a student account', function () {
    $this->actingAs(User::factory()->superAdmin()->create());
    $student = User::factory()->create();

    $this->get("/admin/team/{$student->id}/edit")->assertNotFound();
});
