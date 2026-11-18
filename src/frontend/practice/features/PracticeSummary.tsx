'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { DIFFICULTY_MESSAGE_KEYS, skillLabel } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const PracticeSummaryScreen = observer(function PracticeSummaryScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const t = useUiTranslations();

  const store = usePracticeStore();
  const session = store.session?.id === sessionId ? store.session : null;
  const complete =
    session?.status === 'COMPLETED' && store.results.length === session.totalQuestions;
  const review = [
    ...new Set(
      store.results
        .filter((r) => !r.isCorrect)
        .map((r) => r.progressImpact?.skillCode)
        .filter((s): s is string => !!s),
    ),
  ];

  return (
    <FocusModeShell
      title={t('PRACTICE:PRACTICE_SUMMARY.PAGE.TITLE')}
      exitAction={
        <Button asChild variant="ghost">
          <Link href="/practice">
            {t('PRACTICE:PRACTICE_SESSION.BACK_TO_PRACTICE_BUTTON.LABEL')}
          </Link>
        </Button>
      }>
      {!complete || !session ? (
        <EmptyStatePanel
          title={t('SHARED:SESSION_STATUS.UNAVAILABLE_SUMMARY.TITLE')}
          description={t('PRACTICE:PRACTICE_SUMMARY.UNAVAILABLE_SESSION_STATE.DESCRIPTION')}
          action={
            <Button asChild>
              <Link href={session ? `/practice/sessions/${sessionId}` : '/practice'}>
                {session
                  ? t('PRACTICE:PRACTICE_HUB.RETURN_TO_SESSION_BUTTON.LABEL')
                  : t('PRACTICE:PRACTICE_SESSION.START_PRACTICE_BUTTON.LABEL')}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="min-w-0 space-y-8 wrap-anywhere">
          <header className="space-y-3">
            <h1 className="text-h1 font-semibold">
              {t('PRACTICE:PRACTICE_SUMMARY.COMPLETED_SESSION_STATE.TITLE')}
            </h1>

            <p>
              {session.answeredQuestionsCount}{' '}
              {t('SHARED:LEARNING_STATUS.ANSWER_PROGRESS.CONNECTOR')} {session.totalQuestions}{' '}
              {t('PRACTICE:PRACTICE_SUMMARY.ANSWERED_COUNT.UNIT_LABEL')}
            </p>

            <p className="text-muted-foreground">
              {t('PRACTICE:PRACTICE_HUB.SESSION_DIFFICULTY.LABEL')}{' '}
              {t(DIFFICULTY_MESSAGE_KEYS[session.difficultyBand])}
            </p>
          </header>

          <section
            className="space-y-4 rounded-md border bg-card p-5 sm:p-8"
            aria-label={t('PRACTICE:PRACTICE_SUMMARY.SESSION_RESULTS.TITLE')}>
            <h2 className="text-h3 font-semibold">
              {t('PRACTICE:PRACTICE_SUMMARY.ANSWER_RESULTS.TITLE')}
            </h2>

            <p>
              {store.results.filter((r) => r.isCorrect).length}{' '}
              {t('SHARED:ANSWER_STATUS.CORRECT.COUNT_UNIT_LABEL')}{' '}
              {store.results.filter((r) => !r.isCorrect).length}{' '}
              {t('PRACTICE:PRACTICE_SUMMARY.REVIEW_COUNT.UNIT_LABEL')}
            </p>

            <ol className="space-y-4">
              {store.results.map((r, i) => (
                <li key={r.questionId} className="space-y-1 border-t border-border-subtle pt-4">
                  <p className="font-semibold">
                    {t('PRACTICE:PRACTICE_SESSION.QUESTION_NUMBER.LABEL')} {i + 1}:{' '}
                    {r.isCorrect
                      ? t('SHARED:ANSWER_STATUS.CORRECT.LABEL')
                      : t('SHARED:DIFFICULTY_OPTIONS.REVIEW.LABEL')}{' '}
                    · {r.numericScore}/100
                  </p>

                  {r.feedbackText && <p className="text-body-sm">{r.feedbackText}</p>}
                </li>
              ))}
            </ol>
          </section>

          {review.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold">
                {t('PRACTICE:PRACTICE_SUMMARY.REVIEW_SKILLS.TITLE')}
              </h2>

              <ul className="list-inside list-disc">
                {review.map((s) => (
                  <li key={s}>{skillLabel(s)}</li>
                ))}
              </ul>

              <p className="text-body-sm text-muted-foreground">
                {t('PRACTICE:PRACTICE_SUMMARY.REVIEW_SKILLS.DESCRIPTION')}
              </p>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/practice" onClick={() => store.resetSession()}>
                {t('PRACTICE:PRACTICE_SUMMARY.PRACTICE_AGAIN_BUTTON.LABEL')}
              </Link>
            </Button>

            <Button asChild variant="secondary">
              <Link href="/progress">
                {t('SHARED:LEARNING_ACTIONS.VIEW_PROGRESS_BUTTON.LABEL')}
              </Link>
            </Button>

            <Button asChild variant="secondary">
              <Link href="/syllabus">
                {t('PRACTICE:PRACTICE_SUMMARY.REVIEW_SYLLABUS_BUTTON.LABEL')}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </FocusModeShell>
  );
});
