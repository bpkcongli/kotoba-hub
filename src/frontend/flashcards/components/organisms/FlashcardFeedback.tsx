import { forwardRef } from 'react';
import { isJapanese } from '@/frontend/flashcards/helpers';
import type { FlashcardAnswerResult } from '@/frontend/flashcards/interfaces/entities';

const bucketLabels = { NEW: 'New', LEARNING: 'Learning', MASTERED: 'Mastered' };

export const FlashcardFeedback = forwardRef<HTMLElement, { result: FlashcardAnswerResult }>(
  function FlashcardFeedback({ result }, ref) {
    const feedback = result.feedback;

    return (
      <section
        ref={ref}
        tabIndex={-1}
        aria-labelledby="answer-feedback-heading"
        className="scroll-mt-40 space-y-5 rounded-md border border-border bg-secondary p-5 outline-none focus-visible:focus-ring sm:p-6">
        <div role="status" className="space-y-2">
          <h2 id="answer-feedback-heading" className="text-h3 font-semibold">
            {result.isCorrect ? 'Correct' : 'Incorrect'}
          </h2>

          <p>
            Correct answer:{' '}
            <span
              lang={isJapanese(result.correctAnswer.scriptMode) ? 'ja' : undefined}
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
          Card bucket: {bucketLabels[result.bucketUpdate.previousBucket]} →{' '}
          {bucketLabels[result.bucketUpdate.currentBucket]}
        </p>

        <p className="text-body-sm text-muted-foreground">
          {result.progressImpact
            ? 'Skill progress updated.'
            : 'Card review saved. This card does not update skill mastery.'}
        </p>

        {result.progressImpact && (
          <p className="text-body-sm">
            Skill mastery score: {result.progressImpact.masteryScore}/100
          </p>
        )}

        {feedback.variant === 'KANJI_EXPLANATION' && (
          <div className="space-y-4 border-t pt-4">
            <p className="flex flex-wrap items-baseline gap-3">
              <span lang="ja" className="font-japanese text-h1">
                {feedback.kanjiDetails.character}
              </span>
              <span>{feedback.kanjiDetails.englishMeaning}</span>
            </p>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-body-sm text-muted-foreground">Onyomi</dt>

                <dd lang="ja" className="font-japanese">
                  {feedback.kanjiDetails.onyomi.join('、') || 'None listed'}
                </dd>
              </div>

              <div>
                <dt className="text-body-sm text-muted-foreground">Kunyomi</dt>

                <dd lang="ja" className="font-japanese">
                  {feedback.kanjiDetails.kunyomi.join('、') || 'None listed'}
                </dd>
              </div>
            </dl>

            {feedback.kanjiDetails.exampleWords.length > 0 && (
              <div>
                <h3 className="mb-2 text-body-sm font-semibold">Example words</h3>

                <ul className="space-y-2">
                  {feedback.kanjiDetails.exampleWords.map((word, index) => (
                    <li key={index} className="text-body-sm">
                      <span lang="ja" className="font-japanese">
                        {word.word} · {word.kana}
                      </span>
                      <span> — {word.meaning}</span>
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

            <p>{feedback.vocabularyDetails.englishMeaning}</p>
          </div>
        )}
      </section>
    );
  },
);
