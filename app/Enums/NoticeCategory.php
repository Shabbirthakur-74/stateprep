<?php

namespace App\Enums;

/**
 * Kind of exam notification shown on the notice board.
 */
enum NoticeCategory: string
{
    case Notification = 'notification';
    case AdmitCard = 'admit_card';
    case AnswerKey = 'answer_key';
    case Result = 'result';
    case Syllabus = 'syllabus';
    case Announcement = 'announcement';

    public function label(): string
    {
        return match ($this) {
            self::Notification => 'Notification',
            self::AdmitCard => 'Admit card',
            self::AnswerKey => 'Answer key',
            self::Result => 'Result',
            self::Syllabus => 'Syllabus',
            self::Announcement => 'Announcement',
        };
    }
}
