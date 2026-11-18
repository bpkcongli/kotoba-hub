'use client';

import Link from 'next/link';
import type { LessonProgress } from '@/frontend/progress/interfaces/entities';
import { Badge, Button, Progress } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export function LessonUnderstanding({ lessons }: { lessons: LessonProgress[] }) {
  const t = useUiTranslations();

  if (!lessons.length)
    return (
      <EmptyStatePanel
        title={t('PROGRESS:LESSON_UNDERSTANDING.EMPTY_SELECTION.TITLE')}
        description={t('PROGRESS:LESSON_UNDERSTANDING.EMPTY_SELECTION.DESCRIPTION')}
      />
    );

  const completedCount = lessons.filter((lesson) => lesson.isReview).length;

  return (
    <div className="space-y-3">
      <p className="text-body-sm text-muted-foreground">
        {completedCount} {t('PROGRESS:LESSON_UNDERSTANDING.COMPLETED_COUNT.UNIT_LABEL')}{' '}
        {lessons.length - completedCount}{' '}
        {t('PROGRESS:LESSON_UNDERSTANDING.REQUIRED_QUIZ_COUNT.UNIT_LABEL')}
      </p>

      <ul className="divide-y divide-border-subtle rounded-md border bg-card px-5 sm:px-8">
        {lessons.map((lesson) => (
          <li key={lesson.lessonSlug} className="space-y-4 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">{lesson.title}</h3>

              <Badge variant="outline">
                {lesson.isReview
                  ? t('SHARED:LEARNING_STATUS.COMPLETED.LABEL')
                  : t('SHARED:LEARNING_STATUS.QUIZ_REQUIRED.LABEL')}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-body-sm">
                {t('SHARED:LEARNING_STATUS.UNDERSTANDING.LABEL')} {lesson.currentUnderstandingLevel}{' '}
                {t('PROGRESS:LESSON_UNDERSTANDING.UNDERSTANDING_SCORE.SCALE_LABEL')}
              </p>

              <Progress
                label={t('PROGRESS:LESSON_UNDERSTANDING.LESSON_UNDERSTANDING.ARIA_LABEL', {
                  lesson: lesson.title,
                })}
                value={lesson.currentUnderstandingLevel}
                max={10}
              />

              <p className="text-body-sm text-muted-foreground">
                {lesson.isReview
                  ? t('SYLLABUS:LESSON_ACTIONS.REVIEW_DIFFICULTY.LABEL')
                  : t('PROGRESS:RECENT_SESSIONS.REQUIRED_QUIZ.LABEL')}{' '}
                {t('PROGRESS:LESSON_UNDERSTANDING.NEXT_QUIZ_DIFFICULTY.LABEL')}{' '}
                {lesson.targetDifficultyLevel}{' '}
                {t('PROGRESS:LESSON_UNDERSTANDING.UNDERSTANDING_SCORE.SCALE_LABEL')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href={`/syllabus/lessons/${encodeURIComponent(lesson.lessonSlug)}`}>
                  {t('SHARED:LEARNING_ACTIONS.REVIEW_LESSON_LINK.LABEL')}
                </Link>
              </Button>

              <Button asChild>
                <Link
                  href={`/syllabus/lessons/${encodeURIComponent(lesson.lessonSlug)}/post-study`}>
                  {lesson.isReview
                    ? t('PROGRESS:RECENT_SESSIONS.REVIEW_QUIZ.LABEL')
                    : t('SYLLABUS:LESSON_ACTIONS.START_QUIZ_BUTTON.LABEL')}
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
