'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FlashcardError } from '@/frontend/flashcards/components/organisms';
import {
  CONTENT_MESSAGE_KEYS,
  SCRIPT_MESSAGE_KEYS,
  questionModes,
  answerModes,
} from '@/frontend/flashcards/helpers';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import type { ScriptMode } from '@/frontend/flashcards/interfaces/entities';
import { Button, Select } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const FlashcardsHub = observer(function FlashcardsHub() {
  const t = useUiTranslations();

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
    <div className="min-w-0 space-y-8 wrap-anywhere">
      <header className="space-y-3">
        <h1 className="text-h2 font-semibold md:text-h1">
          {t('SHARED:APP_NAVIGATION.FLASHCARDS_LINK.LABEL')}
        </h1>

        <p className="text-muted-foreground">{t('FLASHCARDS:FLASHCARDS_HUB.PAGE.DESCRIPTION')}</p>
      </header>

      {store.stage !== 'setup' && store.session ? (
        <section className="space-y-4 rounded-md border bg-card p-5 sm:p-8">
          <h2 className="text-h3 font-semibold">
            {store.stage === 'completed'
              ? t('FLASHCARDS:FLASHCARD_SUMMARY.RESULT_SECTION.TITLE')
              : t('FLASHCARDS:FLASHCARDS_HUB.CURRENT_SESSION.TITLE')}
          </h2>

          <p lang={store.session.deck.localization?.resolvedLocale}>{store.session.deck.title}</p>

          <p className="text-body-sm text-muted-foreground">
            {store.session.sessionProgress.totalAnswered}{' '}
            {t('SHARED:LEARNING_STATUS.ANSWER_PROGRESS.CONNECTOR')}{' '}
            {store.session.sessionProgress.totalItems}{' '}
            {t('FLASHCARDS:FLASHCARDS_HUB.CURRENT_SESSION.ANSWERED_DESCRIPTION')}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link
                href={`/flashcards/sessions/${store.session.id}${store.stage === 'completed' ? '/summary' : ''}`}>
                {store.stage === 'completed'
                  ? t('SHARED:LEARNING_ACTIONS.VIEW_SUMMARY_BUTTON.LABEL')
                  : t('FLASHCARDS:FLASHCARDS_HUB.CONTINUE_SESSION_BUTTON.LABEL')}
              </Link>
            </Button>

            <Button
              variant="secondary"
              disabled={store.isSubmitting}
              onClick={() => {
                store.resetSession();
                void store.loadDecks();
              }}>
              {store.stage === 'completed'
                ? t('FLASHCARDS:FLASHCARD_SUMMARY.CHOOSE_ANOTHER_DECK_BUTTON.LABEL')
                : t('FLASHCARDS:FLASHCARDS_HUB.CHANGE_MODES_BUTTON.LABEL')}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <FlashcardError
            title={
              store.errorOperation === 'start'
                ? t('FLASHCARDS:FLASHCARDS_HUB.SESSION_ERROR.TITLE')
                : store.isLoaded
                  ? t('FLASHCARDS:FLASHCARDS_HUB.DECK_REFRESH_ERROR.TITLE')
                  : t('FLASHCARDS:FLASHCARDS_HUB.DECK_LOAD_ERROR.TITLE')
            }
            retry={() => void (store.errorOperation === 'start' ? start() : store.loadDecks())}
          />

          {store.error && store.errorOperation === 'decks' && store.isLoaded && (
            <p className="text-body-sm text-muted-foreground">
              {t('FLASHCARDS:FLASHCARDS_HUB.DECK_LIST.STALE_NOTICE')}
            </p>
          )}

          {store.isLoading ? (
            <LoadingPanel label={t('FLASHCARDS:FLASHCARDS_HUB.DECK_LIST.LOADING_LABEL')} />
          ) : store.isLoaded && !store.decks.length ? (
            <EmptyStatePanel
              title={t('FLASHCARDS:FLASHCARDS_HUB.EMPTY_DECK_LIST.TITLE')}
              description={t('FLASHCARDS:FLASHCARDS_HUB.EMPTY_DECK_LIST.DESCRIPTION')}
              action={
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/syllabus">
                      {t('FLASHCARDS:FLASHCARDS_HUB.OPEN_SYLLABUS_BUTTON.LABEL')}
                    </Link>
                  </Button>

                  <Button variant="secondary" onClick={() => void store.loadDecks()}>
                    {t('FLASHCARDS:FLASHCARDS_HUB.RELOAD_DECKS_BUTTON.LABEL')}
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
              <h2 className="text-h3 font-semibold">
                {t('FLASHCARDS:FLASHCARDS_HUB.SESSION_SETUP.TITLE')}
              </h2>

              <div className="field-stack">
                <label htmlFor="flashcard-deck" className="font-semibold">
                  {t('FLASHCARDS:FLASHCARDS_HUB.DECK_SELECT.LABEL')}
                </label>

                <Select
                  id="flashcard-deck"
                  value={store.selectedDeckId}
                  disabled={store.isStarting}
                  onChange={(event) => store.selectDeck(event.target.value)}>
                  {store.decks.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.itemCount}{' '}
                      {t('FLASHCARDS:FLASHCARDS_HUB.DECK_SUMMARY.CARD_COUNT_UNIT')}
                    </option>
                  ))}
                </Select>

                <p className="text-body-sm text-muted-foreground">
                  {t(CONTENT_MESSAGE_KEYS[deck.contentType])} · {deck.itemCount}{' '}
                  {t('FLASHCARDS:FLASHCARDS_HUB.DECK_OPTION.CARD_COUNT_UNIT')}{' '}
                  {deck.deckSource === 'SYSTEM'
                    ? t('FLASHCARDS:FLASHCARDS_HUB.DECK_SOURCE.SYSTEM_LABEL')
                    : t('FLASHCARDS:FLASHCARDS_HUB.DECK_SOURCE.CUSTOM_LABEL')}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="field-stack">
                  <label htmlFor="question-script" className="font-semibold">
                    {t('FLASHCARDS:FLASHCARDS_HUB.QUESTION_SCRIPT_SELECT.LABEL')}
                  </label>

                  <Select
                    id="question-script"
                    value={store.questionScriptMode}
                    disabled={store.isStarting}
                    onChange={(event) =>
                      store.setQuestionScriptMode(event.target.value as ScriptMode)
                    }>
                    {questionModes(deck.contentType, !!store.contentLocale).map((mode) => (
                      <option key={mode} value={mode}>
                        {t(SCRIPT_MESSAGE_KEYS[mode])}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="field-stack">
                  <label htmlFor="answer-script" className="font-semibold">
                    {t('FLASHCARDS:FLASHCARDS_HUB.ANSWER_SCRIPT_SELECT.LABEL')}
                  </label>

                  <Select
                    id="answer-script"
                    value={store.answerScriptMode}
                    disabled={store.isStarting}
                    onChange={(event) =>
                      store.setAnswerScriptMode(event.target.value as ScriptMode)
                    }>
                    {answerModes(
                      deck.contentType,
                      store.questionScriptMode,
                      !!store.contentLocale,
                    ).map((mode) => (
                      <option key={mode} value={mode}>
                        {t(SCRIPT_MESSAGE_KEYS[mode])}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {deck.localization?.isFallback && (
                <p role="status">
                  {t('FLASHCARDS:FLASHCARDS_HUB.DECK_TRANSLATION_FALLBACK.DESCRIPTION')}
                </p>
              )}

              {store.contentLocale && (
                <p className="text-body-sm text-muted-foreground">
                  {t('FLASHCARDS:FLASHCARDS_HUB.CONTENT_LANGUAGE.LABEL')}{' '}
                  {store.contentLocale === 'id'
                    ? t('SHARED:LANGUAGE_OPTIONS.INDONESIAN.LABEL')
                    : t('SHARED:LANGUAGE_OPTIONS.ENGLISH.LABEL')}
                  {t('FLASHCARDS:FLASHCARDS_HUB.CONTENT_LANGUAGE.FALLBACK_DESCRIPTION')}
                </p>
              )}

              <p className="text-body-sm text-muted-foreground">
                {t('FLASHCARDS:FLASHCARDS_HUB.LOCKED_SCRIPTS.DESCRIPTION')}
              </p>

              {deck.itemCount === 0 && (
                <p role="status">{t('FLASHCARDS:FLASHCARDS_HUB.EMPTY_DECK.DESCRIPTION')}</p>
              )}

              <Button
                type="submit"
                disabled={store.isStarting || deck.itemCount === 0 || !!store.accessIssue}>
                {store.isStarting
                  ? t('FLASHCARDS:FLASHCARDS_HUB.START_SESSION_BUTTON.LOADING_LABEL')
                  : t('FLASHCARDS:FLASHCARDS_HUB.START_SESSION_BUTTON.LABEL')}
              </Button>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
});
