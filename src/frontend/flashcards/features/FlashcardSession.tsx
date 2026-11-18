'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { FlashcardError, FlashcardFeedback } from '@/frontend/flashcards/components/organisms';
import { isJapanese, SCRIPT_MESSAGE_KEYS } from '@/frontend/flashcards/helpers';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import { Button, Progress } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const FlashcardSessionScreen = observer(function FlashcardSessionScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const t = useUiTranslations();

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
      title={t('FLASHCARDS:FLASHCARD_SESSION.PAGE.TITLE')}
      exitAction={
        <Button asChild variant="ghost">
          <Link href="/flashcards">
            {t('FLASHCARDS:FLASHCARD_SESSION.BACK_TO_DECKS_BUTTON.LABEL')}
          </Link>
        </Button>
      }
      progress={
        session ? (
          <div className="space-y-3">
            <p className="text-body-sm">
              {session.sessionProgress.totalAnswered}{' '}
              {t('SHARED:LEARNING_STATUS.ANSWER_PROGRESS.CONNECTOR')}{' '}
              {session.sessionProgress.totalItems} {t('SHARED:LEARNING_STATUS.ANSWERED.UNIT_LABEL')}
            </p>

            <Progress
              value={session.sessionProgress.totalAnswered}
              max={session.sessionProgress.totalItems}
              label={t('FLASHCARDS:FLASHCARD_SESSION.ANSWER_PROGRESS.ARIA_LABEL')}
            />
          </div>
        ) : undefined
      }>
      {!session || !item ? (
        <EmptyStatePanel
          title={t('SHARED:SESSION_STATUS.UNAVAILABLE_SESSION.TITLE')}
          description={t('FLASHCARDS:FLASHCARD_SESSION.UNAVAILABLE_SESSION_STATE.DESCRIPTION')}
          action={
            <Button asChild>
              <Link href="/flashcards">
                {t('FLASHCARDS:FLASHCARD_SESSION.CHOOSE_DECK_BUTTON.LABEL')}
              </Link>
            </Button>
          }
        />
      ) : store.stage === 'completed' ? (
        <EmptyStatePanel
          title={t('SHARED:SESSION_STATUS.COMPLETED.LABEL')}
          description={t('FLASHCARDS:FLASHCARD_SESSION.COMPLETED_SESSION_STATE.DESCRIPTION')}
          action={
            <Button asChild>
              <Link href={`/flashcards/sessions/${sessionId}/summary`}>
                {t('SHARED:LEARNING_ACTIONS.VIEW_SUMMARY_BUTTON.LABEL')}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="min-w-0 space-y-6 wrap-anywhere">
          <header className="space-y-2">
            <h1 lang={session.deck.localization?.resolvedLocale} className="text-h3 font-semibold">
              {session.deck.title}
            </h1>

            <p className="text-body-sm text-muted-foreground">
              {t('FLASHCARDS:FLASHCARD_SESSION.LOCKED_SCRIPTS.LABEL')}{' '}
              {t(SCRIPT_MESSAGE_KEYS[session.sessionConfig.questionScriptMode])} →{' '}
              {t(SCRIPT_MESSAGE_KEYS[session.sessionConfig.answerScriptMode])}
            </p>
          </header>

          {item.localization?.isFallback && (
            <p role="status">
              {t('FLASHCARDS:FLASHCARD_SESSION.TRANSLATION_FALLBACK_NOTICE.DESCRIPTION')}
            </p>
          )}

          <section
            aria-label={t('FLASHCARDS:FLASHCARD_SESSION.CURRENT_CARD.ARIA_LABEL')}
            className="space-y-6 rounded-md border border-border-subtle bg-card p-5 sm:p-8">
            <p className="text-body-sm text-muted-foreground">
              {session.sessionConfig.answerScriptMode === 'MEANING'
                ? t('FLASHCARDS:FLASHCARD_SESSION.MEANING_QUESTION.DESCRIPTION', {
                    language: t(
                      item.localization?.resolvedLocale === 'id'
                        ? 'SHARED:LANGUAGE_OPTIONS.INDONESIAN.LABEL'
                        : 'SHARED:SCRIPT_OPTIONS.ENGLISH.LABEL',
                    ),
                  })
                : t('FLASHCARDS:FLASHCARD_SESSION.SCRIPT_QUESTION.DESCRIPTION', {
                    script: t(SCRIPT_MESSAGE_KEYS[session.sessionConfig.answerScriptMode]),
                  })}
            </p>

            <h2
              ref={promptRef}
              tabIndex={-1}
              lang={isJapanese(item.prompt.scriptMode) ? 'ja' : item.localization?.resolvedLocale}
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
                <legend className="sr-only">
                  {t('SHARED:ANSWER_INPUT.ANSWER_OPTIONS.ARIA_LABEL')}
                </legend>

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
                        lang={
                          isJapanese(option.scriptMode) ? 'ja' : item.localization?.resolvedLocale
                        }
                        className={`min-w-0 flex-1 ${isJapanese(option.scriptMode) ? 'font-japanese' : ''}`}>
                        {option.value}
                      </span>

                      {correct && (
                        <span className="basis-full pl-7 text-body-sm font-semibold">
                          {t('FLASHCARDS:FLASHCARD_SESSION.CORRECT_OPTION.LABEL')}
                        </span>
                      )}

                      {incorrect && (
                        <span className="basis-full pl-7 text-body-sm font-semibold">
                          {t('FLASHCARDS:FLASHCARD_SESSION.INCORRECT_OPTION.LABEL')}
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
                    ? t('SHARED:ANSWER_ACTIONS.CHECK_ANSWER_BUTTON.LOADING_LABEL')
                    : store.answerLocked
                      ? t('SHARED:ANSWER_ACTIONS.RETRY_ANSWER_BUTTON.LABEL')
                      : t('SHARED:ANSWER_ACTIONS.CHECK_ANSWER_BUTTON.LABEL')}
                </Button>
              )}
            </form>
          </section>

          {store.error && (
            <>
              <FlashcardError title={t('SHARED:ANSWER_STATUS.UNCONFIRMED_ANSWER.TITLE')} />

              {store.answerLocked && !store.accessIssue && (
                <p className="text-body-sm text-muted-foreground">
                  {t('FLASHCARDS:FLASHCARD_SESSION.UNCONFIRMED_ANSWER_ERROR.DESCRIPTION')}
                </p>
              )}
            </>
          )}

          {store.stage === 'feedback' && result && (
            <>
              <FlashcardFeedback ref={feedbackRef} result={result} />

              <Button onClick={next}>
                {result.sessionProgress.isCompleted
                  ? t('SHARED:LEARNING_ACTIONS.VIEW_SUMMARY_BUTTON.LABEL')
                  : t('FLASHCARDS:FLASHCARD_SESSION.NEXT_CARD_BUTTON.LABEL')}
              </Button>
            </>
          )}
        </div>
      )}
    </FocusModeShell>
  );
});
