'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PracticeQuestionPanel,
  PracticeFeedback,
  PracticeError,
} from '@/frontend/practice/components/organisms';
import { DIFFICULTY_MESSAGE_KEYS } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button, Progress } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const PracticeSessionScreen = observer(function PracticeSessionScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const t = useUiTranslations();

  const store = usePracticeStore();
  const router = useRouter();

  const session = store.mode === 'random' && store.session?.id === sessionId ? store.session : null;
  const q = store.currentQuestion;

  function next() {
    store.continueSession();

    if (store.stage === 'completed') router.push(`/practice/sessions/${sessionId}/summary`);
  }

  return (
    <FocusModeShell
      title={t('PRACTICE:PRACTICE_SESSION.PAGE.TITLE')}
      exitAction={
        <Button asChild variant="ghost">
          <Link href="/practice">
            {t('PRACTICE:PRACTICE_SESSION.BACK_TO_PRACTICE_BUTTON.LABEL')}
          </Link>
        </Button>
      }
      progress={
        session ? (
          <div className="space-y-3">
            <p className="text-body-sm">
              {session.answeredQuestionsCount}{' '}
              {t('SHARED:LEARNING_STATUS.ANSWER_PROGRESS.CONNECTOR')} {session.totalQuestions}{' '}
              {t('SHARED:LEARNING_STATUS.ANSWERED.UNIT_LABEL')}
            </p>

            <Progress
              value={session.answeredQuestionsCount}
              max={session.totalQuestions}
              label={t('PRACTICE:PRACTICE_SESSION.ANSWER_PROGRESS.ARIA_LABEL')}
            />
          </div>
        ) : undefined
      }>
      {!session ? (
        <EmptyStatePanel
          title={t('SHARED:SESSION_STATUS.UNAVAILABLE_SESSION.TITLE')}
          description={t('PRACTICE:PRACTICE_SESSION.UNAVAILABLE_SESSION_STATE.DESCRIPTION')}
          action={
            <Button asChild>
              <Link href="/practice">
                {t('PRACTICE:PRACTICE_SESSION.START_PRACTICE_BUTTON.LABEL')}
              </Link>
            </Button>
          }
        />
      ) : store.stage === 'completed' ? (
        <EmptyStatePanel
          title={t('SHARED:SESSION_STATUS.COMPLETED.LABEL')}
          description={t('PRACTICE:PRACTICE_SESSION.COMPLETED_SESSION_STATE.DESCRIPTION')}
          action={
            <Button asChild>
              <Link href={`/practice/sessions/${sessionId}/summary`}>
                {t('SHARED:LEARNING_ACTIONS.VIEW_SUMMARY_BUTTON.LABEL')}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="min-w-0 space-y-6 wrap-anywhere">
          <header className="space-y-2">
            <h1 className="text-h3 font-semibold">
              {t('PRACTICE:PRACTICE_SESSION.QUESTION_NUMBER.LABEL')}{' '}
              {store.results.length + (store.stage === 'feedback' ? 0 : 1)}{' '}
              {t('SHARED:LEARNING_STATUS.ANSWER_PROGRESS.CONNECTOR')} {session.totalQuestions}
            </h1>

            <p className="text-body-sm text-muted-foreground">
              {t('PRACTICE:PRACTICE_SESSION.QUESTION_DIFFICULTY.LABEL')}{' '}
              {q && 'difficultyBand' in q ? t(DIFFICULTY_MESSAGE_KEYS[q.difficultyBand]) : '—'}
            </p>
          </header>

          <PracticeQuestionPanel />

          <PracticeError title={t('SHARED:ANSWER_STATUS.UNCONFIRMED_ANSWER.TITLE')} />

          {store.stage === 'feedback' && (
            <>
              <PracticeFeedback />

              <Button onClick={next}>
                {store.answerResult?.sessionProgress.isCompleted
                  ? t('SHARED:LEARNING_ACTIONS.VIEW_SUMMARY_BUTTON.LABEL')
                  : t('PRACTICE:PRACTICE_SESSION.NEXT_QUESTION_BUTTON.LABEL')}
              </Button>
            </>
          )}
        </div>
      )}
    </FocusModeShell>
  );
});
