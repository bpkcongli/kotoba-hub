'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PracticeQuestionPanel,
  PracticeFeedback,
  PracticeError,
} from '@/frontend/practice/components/organisms';
import { DIFFICULTY_LABELS } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button, Progress } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';

export const PracticeSessionScreen = observer(function PracticeSessionScreen({
  sessionId,
}: {
  sessionId: string;
}) {
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
      title="Practice session"
      exitAction={
        <Button asChild variant="ghost">
          <Link href="/practice">Back to practice</Link>
        </Button>
      }
      progress={
        session ? (
          <div className="space-y-3">
            <p className="text-body-sm">
              {session.answeredQuestionsCount} of {session.totalQuestions} answered
            </p>

            <Progress
              value={session.answeredQuestionsCount}
              max={session.totalQuestions}
              label="Questions answered"
            />
          </div>
        ) : undefined
      }>
      {!session ? (
        <EmptyStatePanel
          title="This session is not open here"
          description="Start a new practice session. Any answers already saved remain in your learning history."
          action={
            <Button asChild>
              <Link href="/practice">Start practice</Link>
            </Button>
          }
        />
      ) : store.stage === 'completed' ? (
        <EmptyStatePanel
          title="Session complete"
          description="All questions have been answered."
          action={
            <Button asChild>
              <Link href={`/practice/sessions/${sessionId}/summary`}>View summary</Link>
            </Button>
          }
        />
      ) : (
        <div className="min-w-0 space-y-6 wrap-anywhere">
          <header className="space-y-2">
            <h1 className="text-h3 font-semibold">
              Question {store.results.length + (store.stage === 'feedback' ? 0 : 1)} of{' '}
              {session.totalQuestions}
            </h1>

            <p className="text-body-sm text-muted-foreground">
              Question difficulty:{' '}
              {q && 'difficultyBand' in q ? DIFFICULTY_LABELS[q.difficultyBand] : '—'}
            </p>
          </header>

          <PracticeQuestionPanel />

          <PracticeError title="Your answer could not be confirmed" />

          {store.stage === 'feedback' && (
            <>
              <PracticeFeedback />

              <Button onClick={next}>
                {store.answerResult?.sessionProgress.isCompleted ? 'View summary' : 'Next question'}
              </Button>
            </>
          )}
        </div>
      )}
    </FocusModeShell>
  );
});
