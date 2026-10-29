'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FlashcardError } from '@/frontend/flashcards/components/organisms';
import {
  CONTENT_LABELS,
  SCRIPT_LABELS,
  questionModes,
  answerModes,
} from '@/frontend/flashcards/helpers';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import type { ScriptMode } from '@/frontend/flashcards/interfaces/entities';
import { Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';

const selectClass =
  'min-h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-body focus-visible:focus-ring disabled:opacity-50';

export const FlashcardsHub = observer(function FlashcardsHub() {
  const store = useFlashcardStore();
  const router = useRouter();

  useEffect(() => {
    if (!store.isLoaded) void store.loadDecks();
  }, [store]);

  const deck = store.selectedDeck;
  async function start() {
    await store.startSession();

    if (store.session) router.push(`/flashcards/sessions/${store.session.id}`);
  }

  return (
    <div className="mx-auto max-w-reading min-w-0 space-y-8 wrap-anywhere">
      <header className="space-y-3">
        <h1 className="text-h2 font-semibold md:text-h1">Flashcards</h1>

        <p className="text-muted-foreground">
          Choose a deck, set your scripts, and practise one card at a time.
        </p>
      </header>

      {store.stage !== 'setup' && store.session ? (
        <section className="space-y-4 rounded-md border bg-card p-5 sm:p-8">
          <h2 className="text-h3 font-semibold">
            {store.stage === 'completed' ? 'Your session result' : 'Your current session'}
          </h2>

          <p>{store.session.deck.title}</p>

          <p className="text-body-sm text-muted-foreground">
            {store.session.sessionProgress.totalAnswered} of{' '}
            {store.session.sessionProgress.totalItems} cards answered. Saved answers stay in your
            learning history.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link
                href={`/flashcards/sessions/${store.session.id}${store.stage === 'completed' ? '/summary' : ''}`}>
                {store.stage === 'completed' ? 'View summary' : 'Continue session'}
              </Link>
            </Button>

            <Button
              variant="secondary"
              disabled={store.isSubmitting}
              onClick={() => {
                store.resetSession();
                void store.loadDecks();
              }}>
              {store.stage === 'completed' ? 'Choose another deck' : 'End and choose modes'}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <FlashcardError
            title={
              store.errorOperation === 'start'
                ? 'The session could not start'
                : store.isLoaded
                  ? 'Decks could not be refreshed'
                  : 'Flashcards could not load'
            }
            retry={() => void (store.errorOperation === 'start' ? start() : store.loadDecks())}
          />

          {store.error && store.errorOperation === 'decks' && store.isLoaded && (
            <p className="text-body-sm text-muted-foreground">
              The deck list below has not been refreshed.
            </p>
          )}

          {store.isLoading ? (
            <LoadingPanel label="Loading flashcard decks…" />
          ) : store.isLoaded && !store.decks.length ? (
            <EmptyStatePanel
              title="No flashcard decks available"
              description="Choose a lesson from the syllabus, or check for decks again later."
              action={
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/syllabus">Open syllabus</Link>
                  </Button>

                  <Button variant="secondary" onClick={() => void store.loadDecks()}>
                    Reload decks
                  </Button>
                </div>
              }
            />
          ) : store.isLoaded && deck ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void start();
              }}
              className="space-y-6 rounded-md border border-border-subtle bg-card p-5 sm:p-8">
              <h2 className="text-h3 font-semibold">Set up your session</h2>

              <div className="space-y-2">
                <label htmlFor="flashcard-deck" className="font-semibold">
                  Deck
                </label>

                <select
                  id="flashcard-deck"
                  className={selectClass}
                  value={store.selectedDeckId}
                  disabled={store.isStarting}
                  onChange={(event) => store.selectDeck(event.target.value)}>
                  {store.decks.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.itemCount} cards
                    </option>
                  ))}
                </select>

                <p className="text-body-sm text-muted-foreground">
                  {CONTENT_LABELS[deck.contentType]} · {deck.itemCount} cards ·{' '}
                  {deck.deckSource === 'SYSTEM' ? 'System deck' : 'Your deck'}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="question-script" className="font-semibold">
                    Question script
                  </label>

                  <select
                    id="question-script"
                    className={selectClass}
                    value={store.questionScriptMode}
                    disabled={store.isStarting}
                    onChange={(event) =>
                      store.setQuestionScriptMode(event.target.value as ScriptMode)
                    }>
                    {questionModes(deck.contentType).map((mode) => (
                      <option key={mode} value={mode}>
                        {SCRIPT_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="answer-script" className="font-semibold">
                    Answer script
                  </label>

                  <select
                    id="answer-script"
                    className={selectClass}
                    value={store.answerScriptMode}
                    disabled={store.isStarting}
                    onChange={(event) =>
                      store.setAnswerScriptMode(event.target.value as ScriptMode)
                    }>
                    {answerModes(deck.contentType, store.questionScriptMode).map((mode) => (
                      <option key={mode} value={mode}>
                        {SCRIPT_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-body-sm text-muted-foreground">
                Scripts stay locked during the session. To change them, end the session and start
                again.
              </p>

              {deck.itemCount === 0 && (
                <p role="status">This deck has no cards yet. Choose another deck to practise.</p>
              )}

              <Button
                type="submit"
                disabled={store.isStarting || deck.itemCount === 0 || !!store.accessIssue}>
                {store.isStarting ? 'Starting session…' : 'Start session'}
              </Button>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
});
