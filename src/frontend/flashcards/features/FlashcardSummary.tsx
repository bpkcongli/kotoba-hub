'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const FlashcardSummaryScreen = observer(function FlashcardSummaryScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const t = useUiTranslations();

  const store = useFlashcardStore();
  const session =
    store.session?.id === sessionId && store.stage === 'completed' ? store.session : null;

  return (
    <FocusModeShell
      title={t('FLASHCARDS:FLASHCARD_SUMMARY.PAGE.TITLE')}
      exitAction={
        <Button asChild variant="ghost">
          <Link href="/flashcards">
            {t('FLASHCARDS:FLASHCARD_SESSION.BACK_TO_DECKS_BUTTON.LABEL')}
          </Link>
        </Button>
      }>
      {!session ? (
        <EmptyStatePanel
          title={t('SHARED:SESSION_STATUS.UNAVAILABLE_SUMMARY.TITLE')}
          description={t('FLASHCARDS:FLASHCARD_SUMMARY.UNAVAILABLE_SESSION_STATE.DESCRIPTION')}
          action={
            <Button asChild>
              <Link href="/flashcards">
                {t('FLASHCARDS:FLASHCARD_SESSION.CHOOSE_DECK_BUTTON.LABEL')}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8 wrap-anywhere">
          <header className="space-y-3">
            <h1 className="text-h2 font-semibold md:text-h1">
              {t('SHARED:SESSION_STATUS.COMPLETED.LABEL')}
            </h1>

            <p className="text-muted-foreground">{session.deck.title}</p>
          </header>

          <dl className="grid gap-4 rounded-md border bg-card p-5 sm:grid-cols-3 sm:p-8">
            <div>
              <dt className="text-body-sm text-muted-foreground">
                {t('FLASHCARDS:FLASHCARD_SESSION.ANSWER_PROGRESS.ARIA_LABEL')}
              </dt>

              <dd className="text-h2 font-semibold">
                {session.sessionProgress.totalAnswered}/{session.sessionProgress.totalItems}
              </dd>
            </div>

            <div>
              <dt className="text-body-sm text-muted-foreground">
                {t('SHARED:ANSWER_STATUS.CORRECT.LABEL')}
              </dt>

              <dd className="text-h2 font-semibold">{session.sessionProgress.correctCount}</dd>
            </div>

            <div>
              <dt className="text-body-sm text-muted-foreground">
                {t('SHARED:ANSWER_STATUS.INCORRECT.LABEL')}
              </dt>

              <dd className="text-h2 font-semibold">{session.sessionProgress.incorrectCount}</dd>
            </div>
          </dl>

          <p className="text-body-sm text-muted-foreground">
            {t('FLASHCARDS:FLASHCARD_SUMMARY.SAVED_REVIEWS_NOTICE.DESCRIPTION')}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/flashcards" onClick={() => store.resetSession()}>
                {t('FLASHCARDS:FLASHCARD_SUMMARY.CHOOSE_ANOTHER_DECK_BUTTON.LABEL')}
              </Link>
            </Button>

            <Button asChild variant="secondary">
              <Link href="/progress">
                {t('SHARED:LEARNING_ACTIONS.VIEW_PROGRESS_BUTTON.LABEL')}
              </Link>
            </Button>

            <Button asChild variant="secondary">
              <Link href="/syllabus">
                {t('SHARED:LEARNING_ACTIONS.REVIEW_LESSON_BUTTON.LABEL')}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </FocusModeShell>
  );
});
