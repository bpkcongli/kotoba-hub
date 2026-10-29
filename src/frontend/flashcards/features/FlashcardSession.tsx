'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { FlashcardError, FlashcardFeedback } from '@/frontend/flashcards/components/organisms';
import { isJapanese, SCRIPT_LABELS } from '@/frontend/flashcards/helpers';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import { Button, Progress } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';

export const FlashcardSessionScreen = observer(function FlashcardSessionScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const store = useFlashcardStore();
  const router = useRouter();

  const promptRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLElement>(null);

  const session = store.session?.id === sessionId ? store.session : null;
  const item = session ? store.currentItem : null;
  const result = store.answerResult;

  useEffect(() => {
    if (store.stage === 'feedback') feedbackRef.current?.focus();
    else if (store.stage === 'question') promptRef.current?.focus();
  }, [store.stage, item?.id]);

  function next() {
    store.continueSession();

    if (store.stage === 'completed') router.push(`/flashcards/sessions/${sessionId}/summary`);
  }

  return (
    <FocusModeShell
      title="Flashcard session"
      exitAction={
        <Button asChild variant="ghost">
          <Link href="/flashcards">Back to decks</Link>
        </Button>
      }
      progress={
        session ? (
          <div className="space-y-3">
            <p className="text-body-sm">
              {session.sessionProgress.totalAnswered} of {session.sessionProgress.totalItems}{' '}
              answered
            </p>

            <Progress
              value={session.sessionProgress.totalAnswered}
              max={session.sessionProgress.totalItems}
              label="Cards answered"
            />
          </div>
        ) : undefined
      }>
      {!session || !item ? (
        <EmptyStatePanel
          title="This session is not open here"
          description="Choose a deck and start a new session. Any answers already saved remain in your learning history."
          action={
            <Button asChild>
              <Link href="/flashcards">Choose a deck</Link>
            </Button>
          }
        />
      ) : store.stage === 'completed' ? (
        <EmptyStatePanel
          title="Session complete"
          description="All cards in this session have been answered."
          action={
            <Button asChild>
              <Link href={`/flashcards/sessions/${sessionId}/summary`}>View summary</Link>
            </Button>
          }
        />
      ) : (
        <div className="min-w-0 space-y-6 wrap-anywhere">
          <header className="space-y-2">
            <h1 className="text-h3 font-semibold">{session.deck.title}</h1>

            <p className="text-body-sm text-muted-foreground">
              Scripts locked: {SCRIPT_LABELS[session.sessionConfig.questionScriptMode]} →{' '}
              {SCRIPT_LABELS[session.sessionConfig.answerScriptMode]}
            </p>
          </header>

          <section
            aria-label="Current flashcard"
            className="space-y-6 rounded-md border border-border-subtle bg-card p-5 sm:p-8">
            <p className="text-body-sm text-muted-foreground">
              Choose the {SCRIPT_LABELS[session.sessionConfig.answerScriptMode]} answer.
            </p>

            <h2
              ref={promptRef}
              tabIndex={-1}
              lang={isJapanese(item.prompt.scriptMode) ? 'ja' : undefined}
              className={`py-6 text-center text-4xl leading-relaxed font-semibold outline-none focus-visible:focus-ring sm:text-5xl ${isJapanese(item.prompt.scriptMode) ? 'font-japanese' : ''}`}>
              {item.prompt.value}
            </h2>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void store.submitAnswer();
              }}
              className="space-y-5">
              <fieldset disabled={store.answerLocked || store.isSubmitting} className="space-y-3">
                <legend className="sr-only">Answer options</legend>

                {item.answerOptions.map((option) => {
                  const correct = result?.correctOptionId === option.id;
                  const incorrect =
                    !!result && result.selectedOptionId === option.id && !result.isCorrect;

                  return (
                    <label
                      key={option.id}
                      className={`flex min-h-14 cursor-pointer flex-wrap items-center gap-3 rounded-md border p-4 focus-within:focus-ring ${store.selectedOptionId === option.id ? 'border-primary bg-secondary' : 'border-border'} ${store.answerLocked ? 'cursor-default' : ''}`}>
                      <input
                        type="radio"
                        name="flashcard-answer"
                        value={option.id}
                        checked={store.selectedOptionId === option.id}
                        onChange={() => store.selectOption(option.id)}
                        className="size-4 shrink-0 accent-primary"
                      />
                      <span
                        lang={isJapanese(option.scriptMode) ? 'ja' : undefined}
                        className={`min-w-0 flex-1 ${isJapanese(option.scriptMode) ? 'font-japanese' : ''}`}>
                        {option.value}
                      </span>
                      {correct && (
                        <span className="basis-full pl-7 text-body-sm font-semibold">
                          Correct answer
                        </span>
                      )}
                      {incorrect && (
                        <span className="basis-full pl-7 text-body-sm font-semibold">
                          Your answer · incorrect
                        </span>
                      )}
                    </label>
                  );
                })}
              </fieldset>

              {store.stage === 'question' && (
                <Button
                  type="submit"
                  disabled={!store.selectedOptionId || store.isSubmitting || !!store.accessIssue}>
                  {store.isSubmitting
                    ? 'Checking answer…'
                    : store.answerLocked
                      ? 'Retry answer'
                      : 'Check answer'}
                </Button>
              )}
            </form>
          </section>

          {store.error && (
            <>
              <FlashcardError title="Your answer could not be confirmed" />

              {store.answerLocked && !store.accessIssue && (
                <p className="text-body-sm text-muted-foreground">
                  Your choice is kept. Use Retry answer to confirm it without answering the card
                  twice.
                </p>
              )}
            </>
          )}

          {store.stage === 'feedback' && result && (
            <>
              <FlashcardFeedback ref={feedbackRef} result={result} />

              <Button onClick={next}>
                {result.sessionProgress.isCompleted ? 'View summary' : 'Next card'}
              </Button>
            </>
          )}
        </div>
      )}
    </FocusModeShell>
  );
});
