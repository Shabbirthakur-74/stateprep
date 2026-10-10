<?php

namespace Database\Seeders;

use App\Enums\NoticeCategory;
use App\Models\Exam;
use App\Models\Notice;
use Illuminate\Database\Seeder;

/**
 * Placeholder notices so the notice board has something to show in development. They are not real
 * announcements and have no links. Safe to run repeatedly: notices are matched by title.
 */
class NoticeSeeder extends Seeder
{
    public function run(): void
    {
        $exams = Exam::pluck('id', 'name');

        $notices = [
            // [exam, category, title, summary, days ago, pinned]
            [null, NoticeCategory::Announcement, '[Sample] Welcome to the notice board', 'Recruitment notices, admit cards, answer keys and results for Himachal exams will be posted here.', 0, true],
            ['HPAS (HPPSC Himachal Administrative Service)', NoticeCategory::Notification, '[Sample] HPAS recruitment notification', 'Placeholder for the commission\'s notification and exam schedule.', 2, false],
            ['HP Police Constable', NoticeCategory::AdmitCard, '[Sample] HP Police Constable admit card', 'Placeholder for admit card download details.', 4, false],
            ['HP TET (JBT)', NoticeCategory::AnswerKey, '[Sample] HP TET (JBT) provisional answer key', 'Placeholder for the answer key and objection window.', 9, false],
            ['HP Patwari (HPRCA)', NoticeCategory::Syllabus, '[Sample] HP Patwari syllabus and exam pattern', 'Placeholder for the detailed syllabus and marking scheme.', 15, false],
            ['HP TET (JBT)', NoticeCategory::Result, '[Sample] HP TET (JBT) result', 'Placeholder for the result announcement.', 21, false],
        ];

        foreach ($notices as [$exam, $category, $title, $summary, $daysAgo, $pinned]) {
            Notice::updateOrCreate(['title' => $title], [
                'summary' => $summary,
                'exam_id' => $exam ? $exams->get($exam) : null,
                'category' => $category,
                'published_on' => today()->subDays($daysAgo),
                'is_pinned' => $pinned,
            ]);
        }
    }
}
