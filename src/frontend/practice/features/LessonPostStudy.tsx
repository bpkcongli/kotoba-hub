'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  PracticeQuestionPanel,
  PracticeFeedback,
  PracticeError,
} from '@/frontend/practice/components/organisms';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { PracticeContainerProvider } from '@/frontend/practice/providers';
import { Button } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { LoadingPanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const LessonPostStudyScreen = observer(function LessonPostStudyScreen({
  lessonSlug,
}: {
  lessonSlug: string;
}) {
  const t = useUiTranslations();

  const store = usePracticeStore();
  const quiz = store.lessonQuiz;
  const result = store.lessonResult;

  useEffect(() => {
    void store.loadLessonQuiz(lessonSlug);

    return () => store.dispose();
  }, [store, lessonSlug]);

  const u = result?.understandingProgress;

  return (
    <FocusModeShell
      title={
        quiz?.isReview
          ? t('PRACTICE:LESSON_POST_STUDY.PAGE.REVIEW_TITLE')
          : t('PRACTICE:LESSON_POST_STUDY.PAGE.QUIZ_TITLE')
      }
      exitAction={
        <Button asChild variant="ghost">
          <Link href={`/syllabus/lessons/${lessonSlug}`}>
            {t('PRACTICE:LESSON_POST_STUDY.BACK_TO_LESSON_BUTTON.LABEL')}
          </Link>
        </Button>
      }>
      <div className="min-w-0 space-y-6 wrap-anywhere">
        <header className="space-y-3">
          <h1 className="text-h2 font-semibold">
            {quiz?.isReview
              ? t('PRACTICE:LESSON_POST_STUDY.PAGE.REVIEW_TITLE')
              : t('PRACTICE:LESSON_POST_STUDY.PAGE.QUIZ_TITLE')}
          </h1>

          <p className="text-muted-foreground">
            {t('PRACTICE:LESSON_POST_STUDY.PAGE.DESCRIPTION')}
          </p>
        </header>

        {store.isLoading ? (
          <LoadingPanel label={t('PRACTICE:LESSON_POST_STUDY.QUESTION.LOADING_LABEL')} />
        ) : !quiz ? (
          <>
            <PracticeError title={t('PRACTICE:LESSON_POST_STUDY.QUESTION_ERROR.TITLE')} />

            {!store.accessIssue && (
              <Button onClick={() => void store.loadLessonQuiz(lessonSlug)}>
                {t('SHARED:RECOVERY_ACTIONS.RETRY_BUTTON.LABEL')}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap justify-between gap-3 text-body-sm">
              <p>
                {t('SHARED:LEARNING_STATUS.UNDERSTANDING.LABEL')} {quiz.currentUnderstandingLevel}
                /10
              </p>

              <p>
                {t('SHARED:LEARNING_STATUS.DIFFICULTY.LABEL')} {quiz.targetDifficultyLevel}/10
              </p>

              <p>
                {t('PRACTICE:LESSON_POST_STUDY.TARGET_UNDERSTANDING.LABEL')}{' '}
                {quiz.targetUnderstandingLevel}/10
              </p>
            </div>

            <PracticeQuestionPanel />

            <PracticeError title={t('SHARED:ANSWER_STATUS.UNCONFIRMED_ANSWER.TITLE')} />

            {store.error?.code === 142206002 && !store.accessIssue && (
              <div className="space-y-3">
                <p className="text-body-sm text-muted-foreground">
                  {t('PRACTICE:LESSON_POST_STUDY.STALE_QUESTION_NOTICE.DESCRIPTION')}
                </p>

                <Button onClick={() => void store.loadLessonQuiz(lessonSlug)}>
                  {t('PRACTICE:LESSON_POST_STUDY.LOAD_CURRENT_QUESTION_BUTTON.LABEL')}
                </Button>
              </div>
            )}

            {store.stage === 'feedback' && u && (
              <>
                <PracticeFeedback />

                <section
                  aria-label={t('PRACTICE:LESSON_POST_STUDY.LESSON_RESULT.TITLE')}
                  className="space-y-3 rounded-md border border-border-subtle bg-card p-5">
                  <h2 className="text-h3 font-semibold">
                    {u.postStudyQuizCompleted
                      ? t('PRACTICE:LESSON_POST_STUDY.LESSON_STATUS.COMPLETED_LABEL')
                      : t('SHARED:LEARNING_STATUS.QUIZ_REQUIRED.LABEL')}
                  </h2>

                  <p>
                    {t('SHARED:LEARNING_STATUS.UNDERSTANDING.LABEL')}{' '}
                    {u.currentUnderstandingLevelBefore} → {u.currentUnderstandingLevelAfter}/10
                  </p>

                  <p className="text-body-sm text-muted-foreground">
                    {u.postStudyQuizCompleted
                      ? t('PRACTICE:LESSON_POST_STUDY.LESSON_RESULT.COMPLETED_DESCRIPTION')
                      : t('PRACTICE:LESSON_POST_STUDY.LESSON_RESULT.UNCHANGED_DESCRIPTION')}
                  </p>

                  <p className="text-body-sm">
                    {t('PRACTICE:LESSON_POST_STUDY.NEXT_REVIEW_DIFFICULTY.LABEL')}{' '}
                    {u.nextReviewDifficultyLevel}/10
                  </p>
                </section>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void store.loadLessonQuiz(lessonSlug)}>
                    {u.postStudyQuizCompleted
                      ? t('PRACTICE:LESSON_POST_STUDY.REVIEW_AGAIN_BUTTON.LABEL')
                      : t('PRACTICE:LESSON_POST_STUDY.TRY_ANOTHER_QUESTION_BUTTON.LABEL')}
                  </Button>

                  <Button asChild variant="secondary">
                    <Link href={`/syllabus/lessons/${lessonSlug}`}>
                      {t('SHARED:LEARNING_ACTIONS.REVIEW_LESSON_LINK.LABEL')}
                    </Link>
                  </Button>

                  <Button asChild variant="secondary">
                    <Link href="/progress">
                      {t('SHARED:LEARNING_ACTIONS.VIEW_PROGRESS_BUTTON.LABEL')}
                    </Link>
                  </Button>

                  <Button asChild variant="ghost">
                    <Link href="/syllabus">
                      {t('SHARED:LEARNING_ACTIONS.BACK_TO_SYLLABUS_BUTTON.LABEL')}
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </FocusModeShell>
  );
});

export function LessonPostStudy({ lessonSlug }: { lessonSlug: string }) {
  return (
    <PracticeContainerProvider scopeKey={`post-study:${lessonSlug}`}>
      <LessonPostStudyScreen lessonSlug={lessonSlug} />
    </PracticeContainerProvider>
  );
}
