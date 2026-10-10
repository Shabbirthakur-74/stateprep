<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One or two lines under the notice title on the board.
        Schema::table('notices', function (Blueprint $table) {
            $table->string('summary', 500)->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('notices', function (Blueprint $table) {
            $table->dropColumn('summary');
        });
    }
};
