<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Public exam pages (cover, overview, key facts, highlights, FAQs and the price of the exam bundle),
 * homepage placement of exams, and the cards shown in the homepage carousels.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->string('cover_path')->nullable()->after('description');
            $table->text('overview')->nullable()->after('cover_path');
            $table->json('facts')->nullable()->after('overview');
            $table->json('highlights')->nullable()->after('facts');
            $table->json('faqs')->nullable()->after('highlights');
            $table->boolean('is_free')->default(false)->after('faqs');
            $table->decimal('price', 8, 2)->nullable()->after('is_free');
            $table->decimal('original_price', 8, 2)->nullable()->after('price');
            $table->unsignedSmallInteger('validity_months')->nullable()->after('original_price');
            $table->boolean('show_on_home')->default(true)->after('is_active');
            $table->unsignedInteger('home_position')->default(0)->after('show_on_home');
        });

        // Keep today's alphabetical order on the homepage.
        DB::table('exams')->orderBy('name')->pluck('id')->each(fn ($id, $i) => DB::table('exams')->where('id', $id)->update(['home_position' => $i + 1]));

        Schema::create('home_cards', function (Blueprint $table) {
            $table->id();
            $table->string('section', 20); // tests | materials
            $table->morphs('cardable');
            $table->string('badge', 30)->nullable();
            $table->json('highlights')->nullable();
            $table->string('tag', 40)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['section', 'cardable_type', 'cardable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_cards');

        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn([
                'cover_path', 'overview', 'facts', 'highlights', 'faqs', 'is_free', 'price', 'original_price', 'validity_months',
                'show_on_home', 'home_position',
            ]);
        });
    }
};
