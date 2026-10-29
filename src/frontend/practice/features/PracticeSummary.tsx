'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { DIFFICULTY_LABELS, skillLabel } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';

export const PracticeSummaryScreen = observer(function PracticeSummaryScreen({
  sessionId,
}: {
  sessionId: string;
}) {
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
      title="Practice summary"
      exitAction={
        <Button asChild variant="ghost">
          <Link href="/practice">Back to practice</Link>
        </Button>
      }>
      {!complete || !session ? (
        <EmptyStatePanel
          title="No completed session is open here"
          description="Complete a practice session to view its results here."
          action={
            <Button asChild>
              <Link href={session ? `/practice/sessions/${sessionId}` : '/practice'}>
                {session ? 'Return to session' : 'Start practice'}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="min-w-0 space-y-8 wrap-anywhere">
          <header className="space-y-3">
            <h1 className="text-h1 font-semibold">Practice complete</h1>

            <p>
              {session.answeredQuestionsCount} of {session.totalQuestions} questions answered
            </p>

            <p className="text-muted-foreground">
              Session difficulty: {DIFFICULTY_LABELS[session.difficultyBand]}
            </p>
          </header>

          <section
            className="space-y-4 rounded-md border bg-card p-5 sm:p-8"
            aria-label="Session results">
            <h2 className="text-h3 font-semibold">Your results</h2>

            <p>
              {store.results.filter((r) => r.isCorrect).length} correct ·{' '}
              {store.results.filter((r) => !r.isCorrect).length} to review
            </p>

            <ol className="space-y-4">
              {store.results.map((r, i) => (
                <li key={r.questionId} className="space-y-1 border-t border-border-subtle pt-4">
                  <p className="font-semibold">
                    Question {i + 1}: {r.isCorrect ? 'Correct' : 'Review'} · {r.numericScore}/100
                  </p>

                  {r.feedbackText && <p className="text-body-sm">{r.feedbackText}</p>}
                </li>
              ))}
            </ol>
          </section>

          {review.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold">Skills to revisit</h2>

              <ul className="list-inside list-disc">
                {review.map((s) => (
                  <li key={s}>{skillLabel(s)}</li>
                ))}
              </ul>

              <p className="text-body-sm text-muted-foreground">
                Use the syllabus to review these topics before another session.
              </p>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/practice" onClick={() => store.resetSession()}>
                Practice again
              </Link>
            </Button>

            <Button asChild variant="secondary">
              <Link href="/syllabus">Review syllabus</Link>
            </Button>
          </div>
        </div>
      )}
    </FocusModeShell>
  );
});
