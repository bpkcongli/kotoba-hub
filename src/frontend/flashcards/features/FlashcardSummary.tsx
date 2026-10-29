'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';

export const FlashcardSummaryScreen = observer(function FlashcardSummaryScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const store = useFlashcardStore();
  const session =
    store.session?.id === sessionId && store.stage === 'completed' ? store.session : null;

  return (
    <FocusModeShell
      title="Flashcard summary"
      exitAction={
        <Button asChild variant="ghost">
          <Link href="/flashcards">Back to decks</Link>
        </Button>
      }>
      {!session ? (
        <EmptyStatePanel
          title="No completed session is open here"
          description="Finish a session to see its result. Saved answers remain in your learning history."
          action={
            <Button asChild>
              <Link href="/flashcards">Choose a deck</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8 wrap-anywhere">
          <header className="space-y-3">
            <h1 className="text-h2 font-semibold md:text-h1">Session complete</h1>

            <p className="text-muted-foreground">{session.deck.title}</p>
          </header>

          <dl className="grid gap-4 rounded-md border bg-card p-5 sm:grid-cols-3 sm:p-8">
            <div>
              <dt className="text-body-sm text-muted-foreground">Cards answered</dt>

              <dd className="text-h2 font-semibold">
                {session.sessionProgress.totalAnswered}/{session.sessionProgress.totalItems}
              </dd>
            </div>

            <div>
              <dt className="text-body-sm text-muted-foreground">Correct</dt>

              <dd className="text-h2 font-semibold">{session.sessionProgress.correctCount}</dd>
            </div>

            <div>
              <dt className="text-body-sm text-muted-foreground">Incorrect</dt>

              <dd className="text-h2 font-semibold">{session.sessionProgress.incorrectCount}</dd>
            </div>
          </dl>

          <p className="text-body-sm text-muted-foreground">
            Your card reviews are saved. Card buckets and skill mastery are tracked separately;
            completing this session does not complete a lesson.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/flashcards" onClick={() => store.resetSession()}>
                Choose another deck
              </Link>
            </Button>

            <Button asChild variant="secondary">
              <Link href="/syllabus">Review a lesson</Link>
            </Button>
          </div>
        </div>
      )}
    </FocusModeShell>
  );
});
