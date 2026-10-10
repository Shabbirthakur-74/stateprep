<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Permission;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Super admins add team members and choose which admin sections each one can use.
 */
class TeamController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('admin/team/index', [
            'members' => User::whereIn('role', Role::staff())->orderByRaw("role = 'super_admin' desc")->orderBy('name')->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'role_label' => $user->roleLabel(),
                    'permissions' => array_map(fn ($p) => $p->label(), $user->grantedPermissions()),
                    'is_me' => $user->id === $request->user()->id,
                ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/team/form', ['permissions' => Permission::options()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules());

        $member = User::forceCreate([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => Role::from($data['role']),
            'permissions' => $data['role'] === Role::Staff->value ? array_values($data['permissions'] ?? []) : null,
            'email_verified_at' => now(),
        ]);

        return to_route('admin.team.index')->with('status', "{$member->name} has been added to the team.");
    }

    public function edit(User $member): Response
    {
        abort_unless($member->isStaff(), 404);

        return Inertia::render('admin/team/form', [
            'permissions' => Permission::options(),
            'member' => [
                ...$member->only('id', 'name', 'email'),
                'role' => $member->role->value,
                'permissions' => $member->permissions ?? [],
            ],
        ]);
    }

    public function update(Request $request, User $member): RedirectResponse
    {
        abort_unless($member->isStaff(), 404);
        $data = $request->validate($this->rules($member));

        // Nobody can lower their own access, so there is always at least one super admin.
        $role = $member->id === $request->user()->id ? Role::SuperAdmin : Role::from($data['role']);

        $member->forceFill([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $role,
            'permissions' => $role === Role::Staff ? array_values($data['permissions'] ?? []) : null,
        ]);
        if (! empty($data['password'])) {
            $member->password = $data['password'];
        }
        $member->save();

        return to_route('admin.team.index')->with('status', "{$member->name}'s access has been saved.");
    }

    public function destroy(Request $request, User $member): RedirectResponse
    {
        abort_unless($member->isStaff(), 404);

        if ($member->id === $request->user()->id) {
            return back()->withErrors(['member' => 'You cannot remove your own account.']);
        }

        $member->delete();

        return to_route('admin.team.index')->with('status', "{$member->name} has been removed from the team.");
    }

    private function rules(?User $member = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users')->ignore($member)],
            'password' => [$member ? 'nullable' : 'required', 'string', Password::defaults()],
            'role' => ['required', Rule::in(array_map(fn ($r) => $r->value, Role::staff()))],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => [Rule::enum(Permission::class)],
        ];
    }
}
