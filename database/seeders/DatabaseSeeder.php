<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->superAdmin()->create(['name' => 'Super Admin', 'email' => 'superadmin@preparena.test']);
        User::factory()->staff()->create(['name' => 'Admin User', 'email' => 'admin@preparena.test']);
        User::factory()->create(['name' => 'Test Student', 'email' => 'student@preparena.test']);

        $this->call([ContentSeeder::class, NoticeSeeder::class]);
    }
}
