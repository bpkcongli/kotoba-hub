'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { Badge, Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel, ErrorStatePanel } from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useUiTranslations } from '@/frontend/shared/hooks';
import { LessonContent, SyllabusState } from '@/frontend/syllabus/components/organisms';
import { useSyllabusStore } from '@/frontend/syllabus/hooks';
import { SyllabusContainerProvider } from '@/frontend/syllabus/providers';

export const LessonOverviewScreen = observer(function LessonOverviewScreen({
  lessonSlug,
}: {
  lessonSlug: string;
}) {
  const t = useUiTranslations();
  const uiLocale = useLocale();

  const store = useSyllabusStore();

  useEffect(() => {
    void store.loadLesson(lessonSlug);

    return () => store.dispose();
  }, [store, lessonSlug]);

  const lesson = store.lesson;
  const quiz = store.quiz;

  return (
    <SyllabusState retry={() => void store.loadLesson(lessonSlug)}>
      {lesson && (
        <div className="mx-auto max-w-reading min-w-0 space-y-8 wrap-anywhere [&_a]:max-w-full [&_button]:max-w-full">
          <Button asChild variant="ghost">
            <Link href={`/syllabus/units/${lesson.unit.slug}`}>
              {t('SYLLABUS:LESSON_OVERVIEW.BACK_LINK.PREFIX')} {lesson.unit.title}
            </Link>
          </Button>

          <header lang={lesson?.localization?.resolvedLocale} className="space-y-4">
            <p
              lang={lesson.unit.localization?.resolvedLocale}
              className="text-body-sm text-muted-foreground">
              {lesson.track.curriculumLevel} · {lesson.unit.title}
            </p>

            <h1 className="text-h1 font-semibold">{lesson.title}</h1>

            {lesson.learningObjective && <p className="text-body-lg">{lesson.learningObjective}</p>}

            <div lang={uiLocale} className="flex flex-wrap items-center gap-3 text-body-sm">
              <Badge>
                {quiz?.currentUnderstandingLevel
                  ? t('SHARED:LEARNING_STATUS.COMPLETED.LABEL')
                  : store.readingFinished
                    ? t('SHARED:LEARNING_STATUS.QUIZ_REQUIRED.LABEL')
                    : t('SHARED:LEARNING_STATUS.READING.LABEL')}
              </Badge>

              {lesson.estimatedMinutes !== null && (
                <span>
                  {t('SYLLABUS:LESSON_OVERVIEW.DURATION.LABEL')} {lesson.estimatedMinutes}{' '}
                  {t('SYLLABUS:LESSON_OVERVIEW.DURATION.UNIT_LABEL')}
                </span>
              )}

              {quiz && (
                <span>
                  {t('SHARED:LEARNING_STATUS.UNDERSTANDING.LABEL')} {quiz.currentUnderstandingLevel}
                  /10
                </span>
              )}
            </div>

            <ul
              lang={uiLocale}
              aria-label={t('SYLLABUS:LESSON_OVERVIEW.COVERED_SKILLS_SECTION.TITLE')}
              className="flex flex-wrap gap-3 text-body-sm text-muted-foreground">
              {lesson.skills.map((skill) => (
                <li lang={skill.localization?.resolvedLocale} key={skill.code}>
                  {skill.title}
                </li>
              ))}
            </ul>
          </header>

          {lesson.contentBlocks.length ? (
            <LessonContent blocks={lesson.contentBlocks} />
          ) : (
            <EmptyStatePanel
              title={t('SYLLABUS:LESSON_OVERVIEW.UNAVAILABLE_MATERIAL_STATE.TITLE')}
              description={t('SYLLABUS:LESSON_OVERVIEW.UNAVAILABLE_MATERIAL_STATE.DESCRIPTION')}
              action={
                <Button onClick={() => void store.loadLesson(lessonSlug)}>
                  {t('SYLLABUS:LESSON_OVERVIEW.RELOAD_LESSON_BUTTON.LABEL')}
                </Button>
              }
            />
          )}

          <section
            aria-labelledby="lesson-quiz-heading"
            className="space-y-4 rounded-md border border-border bg-card p-5 sm:p-6">
            <h2 id="lesson-quiz-heading" className="text-h2 font-semibold">
              {quiz?.isReview
                ? t('SYLLABUS:LESSON_ACTIONS.REVIEW_LESSON_BUTTON.LABEL')
                : t('SYLLABUS:LESSON_ACTIONS.CHECK_UNDERSTANDING_BUTTON.LABEL')}
            </h2>

            <p className="text-muted-foreground">
              {t('SYLLABUS:LESSON_OVERVIEW.QUIZ_REQUIREMENT_NOTICE.DESCRIPTION')}
            </p>

            {quiz ? (
              <p className="text-body-sm">
                {quiz.isReview
                  ? t('SYLLABUS:LESSON_ACTIONS.REVIEW_DIFFICULTY.LABEL')
                  : t('SYLLABUS:LESSON_ACTIONS.QUIZ_DIFFICULTY.LABEL')}
                {t('SYLLABUS:LESSON_OVERVIEW.NEXT_QUIZ_DIFFICULTY.LABEL')}{' '}
                {quiz.targetDifficultyLevel}
                {t('SYLLABUS:LESSON_OVERVIEW.TARGET_UNDERSTANDING.LABEL')}{' '}
                {quiz.targetUnderstandingLevel}/10
              </p>
            ) : store.quizError ? (
              <ErrorStatePanel
                title={t('SYLLABUS:LESSON_OVERVIEW.QUIZ_DETAILS_ERROR.TITLE')}
                description={errorMessage(store.quizError, t)}
                action={
                  <Button onClick={() => void store.loadQuiz(lessonSlug)}>
                    {t('SYLLABUS:LESSON_OVERVIEW.RELOAD_QUIZ_DETAILS_BUTTON.LABEL')}
                  </Button>
                }
              />
            ) : (
              <p role="status" className="text-body-sm text-muted-foreground">
                {t('SYLLABUS:LESSON_OVERVIEW.QUIZ_DETAILS.LOADING_LABEL')}
              </p>
            )}

            {lesson.contentBlocks.length > 0 &&
              (!store.readingFinished && !quiz?.isReview ? (
                <Button onClick={store.finishReading}>
                  {t('SYLLABUS:LESSON_OVERVIEW.FINISH_READING_BUTTON.LABEL')}
                </Button>
              ) : quiz ? (
                <Button asChild>
                  <Link href={`/syllabus/lessons/${lessonSlug}/post-study`}>
                    {quiz.isReview
                      ? t('SYLLABUS:LESSON_ACTIONS.REVIEW_QUIZ_BUTTON.LABEL')
                      : t('SYLLABUS:LESSON_ACTIONS.START_QUIZ_BUTTON.LABEL')}
                  </Link>
                </Button>
              ) : null)}

            <p className="text-caption text-muted-foreground">
              {t('SYLLABUS:LESSON_OVERVIEW.READING_STATE_NOTICE.DESCRIPTION')}
            </p>
          </section>
        </div>
      )}
    </SyllabusState>
  );
});

export function LessonOverview({ lessonSlug }: { lessonSlug: string }) {
  return (
    <SyllabusContainerProvider scopeKey={`lesson:${lessonSlug}`}>
      <LessonOverviewScreen lessonSlug={lessonSlug} />
    </SyllabusContainerProvider>
  );
}
