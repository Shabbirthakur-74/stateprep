<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Permission;
use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'permissions' => 'array',
        ];
    }

    public function quizAttempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }

    public function testAttempts(): HasMany
    {
        return $this->hasMany(TestAttempt::class);
    }

    /**
     * Study material the student saved to "My Library".
     */
    public function savedMaterials(): BelongsToMany
    {
        return $this->belongsToMany(StudyMaterial::class, 'saved_materials')->withTimestamps();
    }

    /**
     * Admin sections this user may use. Super admins have all of them; staff have what they were given.
     *
     * @return list<Permission>
     */
    public function grantedPermissions(): array
    {
        return match ($this->role) {
            Role::SuperAdmin => Permission::cases(),
            Role::Staff => array_values(array_filter(array_map(fn ($v) => Permission::tryFrom($v), $this->permissions ?? []))),
            default => [],
        };
    }

    public function hasPermission(Permission $permission): bool
    {
        return in_array($permission, $this->grantedPermissions(), true);
    }

    /**
     * Name shown for this account's access level, e.g. "Super Admin".
     */
    public function roleLabel(): string
    {
        return $this->role->label();
    }

    /**
     * True for any account that can use the admin area.
     */
    public function isStaff(): bool
    {
        return $this->role->isStaff();
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === Role::SuperAdmin;
    }

    public function isStudent(): bool
    {
        return $this->role === Role::Student;
    }

    /**
     * Where this user lands after logging in: the admin dashboard for staff, the student dashboard for students.
     */
    public function dashboardRoute(): string
    {
        return $this->isStaff() ? 'admin.dashboard' : 'student.dashboard';
    }
}
