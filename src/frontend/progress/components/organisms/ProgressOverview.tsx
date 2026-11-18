'use client';

import Link from 'next/link';
import { difficultyLabel, progressNumber, progressTime } from '@/frontend/progress/helpers';
import type { ProgressOverview as Overview } from '@/frontend/progress/interfaces/entities';
import { Button, Progress } from '@/frontend/shared/components/atoms';
import { useUiTranslations } from '@/frontend/shared/hooks';
import type { Locale } from '@/shared/locale';

export function ProgressOverview({
  overview,
  locale = 'en',
}: {
  overview: Overview;
  locale?: Locale;
}) {
  const t = useUiTranslations();

  const lessons = overview.lessonUnderstandingSummary;

  return (
    <section
      aria-labelledby="progress-overview-title"
      className="space-y-6 rounded-md border bg-card p-5 sm:p-8">
      <div className="space-y-2">
        <h2 id="progress-overview-title" className="text-h3 font-semibold">
          {t('PROGRESS:PROGRESS_OVERVIEW.SECTION.TITLE')}
        </h2>

        <p className="text-body-sm text-muted-foreground">
          {t('PROGRESS:PROGRESS_OVERVIEW.LAST_ACTIVITY.LABEL')}{' '}
          {overview.lastActivityAt
            ? progressTime(overview.lastActivityAt, locale)
            : t('PROGRESS:PROGRESS_OVERVIEW.EMPTY_ACTIVITY.LABEL')}
        </p>
      </div>

      <dl className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <dt className="text-body-sm text-muted-foreground">
            {t('PROGRESS:PROGRESS_OVERVIEW.AVERAGE_SKILL_MASTERY.LABEL')}
          </dt>
          <dd className="text-h2 font-semibold">
            {overview.trackedSkillsCount
              ? `${progressNumber(overview.averageMasteryScore, locale)}/100`
              : t('PROGRESS:PROGRESS_DASHBOARD.EMPTY_ATTEMPTS.LABEL')}
          </dd>

          <Progress
            label={t('PROGRESS:PROGRESS_OVERVIEW.AVERAGE_SKILL_MASTERY.LABEL')}
            value={overview.averageMasteryScore}
          />

          <p className="text-caption text-muted-foreground">
            {t('PROGRESS:PROGRESS_OVERVIEW.SKILL_COUNT.PREFIX')} {overview.trackedSkillsCount}{' '}
            {t('PROGRESS:PROGRESS_OVERVIEW.SKILL_COUNT.UNIT_LABEL')}
          </p>
        </div>

        <div className="space-y-2">
          <dt className="text-body-sm text-muted-foreground">
            {t('PROGRESS:PROGRESS_OVERVIEW.COMPLETED_LESSONS.LABEL')}
          </dt>
          <dd className="text-h2 font-semibold">
            {lessons.completedLessonsCount} {t('SHARED:LEARNING_STATUS.ANSWER_PROGRESS.CONNECTOR')}{' '}
            {lessons.trackedLessonsCount}{' '}
            {t('PROGRESS:PROGRESS_OVERVIEW.TRACKED_LESSON_COUNT.UNIT_LABEL')}
          </dd>

          <p className="text-caption text-muted-foreground">
            {t('PROGRESS:PROGRESS_OVERVIEW.COMPLETED_LESSONS.HELP_TEXT')}
          </p>
        </div>

        <div className="space-y-2">
          <dt className="text-body-sm text-muted-foreground">
            {t('PROGRESS:PROGRESS_OVERVIEW.AVERAGE_LESSON_UNDERSTANDING.LABEL')}
          </dt>
          <dd className="text-h2 font-semibold">
            {lessons.trackedLessonsCount
              ? t('PROGRESS:LESSON_UNDERSTANDING.UNDERSTANDING_SCORE.LABEL', {
                  value: progressNumber(lessons.averageUnderstandingLevel, locale),
                })
              : t('PROGRESS:RECENT_SESSIONS.EMPTY_QUIZ_ATTEMPTS.LABEL')}
          </dd>

          <Progress
            label={t('PROGRESS:PROGRESS_OVERVIEW.AVERAGE_LESSON_UNDERSTANDING.LABEL')}
            value={lessons.averageUnderstandingLevel}
            max={10}
          />

          <p className="text-caption text-muted-foreground">
            {t('PROGRESS:PROGRESS_OVERVIEW.AVERAGE_LESSON_UNDERSTANDING.HELP_TEXT')}
          </p>
        </div>
      </dl>

      <div className="space-y-3 border-t border-border-subtle pt-5">
        <h3 className="font-semibold">{t('PROGRESS:PROGRESS_OVERVIEW.MASTERY_GROUPS.TITLE')}</h3>

        <dl className="flex flex-wrap gap-x-6 gap-y-3 text-body-sm">
          <div>
            <dt className="inline">
              {t('PROGRESS:PROGRESS_OVERVIEW.MASTERY_GROUPS.MASTERED_LABEL')}{' '}
            </dt>
            <dd className="inline font-semibold">{overview.masteredSkillsCount}</dd>
          </div>

          <div>
            <dt className="inline">
              {t('PROGRESS:PROGRESS_OVERVIEW.MASTERY_GROUPS.DEVELOPING_LABEL')}{' '}
            </dt>
            <dd className="inline font-semibold">{overview.developingSkillsCount}</dd>
          </div>

          <div>
            <dt className="inline">{t('PROGRESS:PROGRESS_OVERVIEW.MASTERY_GROUPS.WEAK_LABEL')} </dt>
            <dd className="inline font-semibold">{overview.weakSkillsCount}</dd>
          </div>
        </dl>

        <p className="text-body-sm text-muted-foreground">
          {t('PROGRESS:PROGRESS_OVERVIEW.RECOMMENDED_DIFFICULTY.LABEL')}{' '}
          {difficultyLabel(overview.recommendedDifficultyBand, locale)}
        </p>
      </div>
    </section>
  );
}

export function WeakSkillAction({ overview }: { overview: Overview }) {
  const t = useUiTranslations();

  return (
    <section
      aria-labelledby="weak-skills-title"
      className="space-y-3 rounded-md border bg-card p-5 sm:p-8">
      <h2 id="weak-skills-title" className="text-h3 font-semibold">
        {overview.weakSkillsCount
          ? t('PROGRESS:WEAK_SKILLS.SECTION.TITLE')
          : t('PROGRESS:WEAK_SKILLS.CONTINUE_PRACTICE_NOTICE.TITLE')}
      </h2>

      <p>
        {overview.weakSkillsCount
          ? t('PROGRESS:WEAK_SKILLS.SECTION.DESCRIPTION', { count: overview.weakSkillsCount })
          : t('PROGRESS:WEAK_SKILLS.CONTINUE_PRACTICE_NOTICE.DESCRIPTION')}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/practice">{t('PRACTICE:PRACTICE_SESSION.START_PRACTICE_BUTTON.LABEL')}</Link>
        </Button>

        <Button asChild variant="secondary">
          <Link href="/flashcards">
            {t('PROGRESS:PROGRESS_OVERVIEW.REVIEW_FLASHCARDS_BUTTON.LABEL')}
          </Link>
        </Button>
      </div>
    </section>
  );
}
