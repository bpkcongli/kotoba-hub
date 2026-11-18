'use client';

import { useLocale } from 'next-intl';
import { forwardRef } from 'react';
import { isJapanese } from '@/frontend/flashcards/helpers';
import type { FlashcardAnswerResult } from '@/frontend/flashcards/interfaces/entities';
import { useUiTranslations } from '@/frontend/shared/hooks';

const bucketMessageKeys = {
  NEW: 'FLASHCARDS:BUCKET_OPTIONS.NEW.LABEL',
  LEARNING: 'FLASHCARDS:BUCKET_OPTIONS.LEARNING.LABEL',
  MASTERED: 'FLASHCARDS:BUCKET_OPTIONS.MASTERED.LABEL',
} as const;

export const FlashcardFeedback = forwardRef<HTMLElement, { result: FlashcardAnswerResult }>(
  function FlashcardFeedback({ result }, ref) {
    const t = useUiTranslations();
    const uiLocale = useLocale();

    const feedback = result.feedback;

    return (
      <section
        ref={ref}
        tabIndex={-1}
        aria-labelledby="answer-feedback-heading"
        className="scroll-mt-40 space-y-5 rounded-md border border-border bg-secondary p-5 outline-none focus-visible:focus-ring sm:p-6">
        <div role="status" className="space-y-2">
          <h2 id="answer-feedback-heading" className="text-h3 font-semibold">
            {result.isCorrect
              ? t('SHARED:ANSWER_STATUS.CORRECT.LABEL')
              : t('SHARED:ANSWER_STATUS.INCORRECT.LABEL')}
          </h2>

          <p>
            {t('FLASHCARDS:ANSWER_FEEDBACK.CORRECT_ANSWER.LABEL')}{' '}
            <span
              lang={
                isJapanese(result.correctAnswer.scriptMode)
                  ? 'ja'
                  : result.localization?.resolvedLocale
              }
              className={
                isJapanese(result.correctAnswer.scriptMode)
                  ? 'font-japanese font-semibold'
                  : 'font-semibold'
              }>
              {result.correctAnswer.value}
            </span>
          </p>
        </div>

        <p className="text-body-sm">
          {t('FLASHCARDS:ANSWER_FEEDBACK.CARD_BUCKET.LABEL')}{' '}
          {t(bucketMessageKeys[result.bucketUpdate.previousBucket])} →{' '}
          {t(bucketMessageKeys[result.bucketUpdate.currentBucket])}
        </p>

        <p className="text-body-sm text-muted-foreground">
          {result.progressImpact
            ? t('FLASHCARDS:ANSWER_FEEDBACK.MASTERY_UPDATE_NOTICE.DESCRIPTION')
            : t('FLASHCARDS:ANSWER_FEEDBACK.CARD_REVIEW_NOTICE.DESCRIPTION')}
        </p>

        {result.progressImpact && (
          <p className="text-body-sm">
            {t('FLASHCARDS:ANSWER_FEEDBACK.SKILL_MASTERY_SCORE.LABEL')}{' '}
            {result.progressImpact.masteryScore}/100
          </p>
        )}

        {feedback.explanationText && (
          <p lang={result.localization?.resolvedLocale}>{feedback.explanationText}</p>
        )}

        {feedback.variant === 'KANJI_EXPLANATION' && (
          <div className="space-y-4 border-t pt-4">
            <p className="flex flex-wrap items-baseline gap-3">
              <span lang="ja" className="font-japanese text-h1">
                {feedback.kanjiDetails.character}
              </span>

              <span lang={result.localization?.resolvedLocale}>
                {feedback.kanjiDetails.meaning ?? feedback.kanjiDetails.englishMeaning}
              </span>
            </p>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-body-sm text-muted-foreground">
                  {t('FLASHCARDS:ANSWER_FEEDBACK.ONYOMI.LABEL')}
                </dt>

                <dd lang="ja" className="font-japanese">
                  {feedback.kanjiDetails.onyomi.join('、') || (
                    <span lang={uiLocale}>
                      {t('FLASHCARDS:ANSWER_FEEDBACK.EMPTY_READING_LIST.LABEL')}
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-body-sm text-muted-foreground">
                  {t('FLASHCARDS:ANSWER_FEEDBACK.KUNYOMI.LABEL')}
                </dt>

                <dd lang="ja" className="font-japanese">
                  {feedback.kanjiDetails.kunyomi.join('、') || (
                    <span lang={uiLocale}>
                      {t('FLASHCARDS:ANSWER_FEEDBACK.EMPTY_READING_LIST.LABEL')}
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            {feedback.kanjiDetails.exampleWords.length > 0 && (
              <div>
                <h3 className="mb-2 text-body-sm font-semibold">
                  {t('FLASHCARDS:ANSWER_FEEDBACK.EXAMPLE_WORDS.TITLE')}
                </h3>

                <ul className="space-y-2">
                  {feedback.kanjiDetails.exampleWords.map((word, index) => (
                    <li key={index} className="text-body-sm">
                      <span lang="ja" className="font-japanese">
                        {word.word} · {word.kana}
                      </span>

                      <span lang={result.localization?.resolvedLocale}> — {word.meaning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {feedback.variant === 'VOCABULARY_EXPLANATION' && (
          <div className="space-y-2 border-t pt-4">
            <p lang="ja" className="font-japanese text-h2">
              {feedback.vocabularyDetails.term}
            </p>

            {feedback.vocabularyDetails.kana && (
              <p lang="ja" className="font-japanese">
                {feedback.vocabularyDetails.kana}
              </p>
            )}

            <p lang={result.localization?.resolvedLocale}>
              {feedback.vocabularyDetails.meaning ?? feedback.vocabularyDetails.englishMeaning}
            </p>
          </div>
        )}
      </section>
    );
  },
);
