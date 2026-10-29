'use client';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button } from '@/frontend/shared/components/atoms';

const fieldClass =
  'min-h-11 w-full rounded-md border border-border-strong bg-background px-3 py-3 font-japanese text-body outline-none focus-visible:focus-ring disabled:opacity-70';

export const PracticeQuestionPanel = observer(function PracticeQuestionPanel() {
  const store = usePracticeStore();
  const q = store.currentQuestion;
  const promptRef = useRef<HTMLHeadingElement>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (store.stage === 'question') promptRef.current?.focus();
  }, [q?.id, store.stage]);

  if (!q) return null;

  const short = q.questionType === 'SHORT_FREE_RESPONSE';
  const slot = q.questionType === 'SLOT_FILL';
  const arrange = q.questionType === 'ARRANGE_TOKEN';
  const free = q.questionType === 'FREE_RESPONSE';
  const source = short || slot ? q.promptPayload.sentenceTemplate : q.promptPayload.sourceSentence;
  const japanese = short || slot || q.promptPayload.promptLanguage === 'JA';
  const title = short
    ? 'Fill in the missing kana'
    : slot
      ? 'Choose the missing word'
      : arrange
        ? 'Arrange the sentence'
        : 'Write the sentence in Japanese';

  return (
    <section
      aria-label={store.mode === 'lesson' ? 'Lesson question' : 'Practice question'}
      className="min-w-0 space-y-6 rounded-md border border-border-subtle bg-card p-5 wrap-anywhere sm:p-8">
      <h2 className="text-h3 font-semibold">{title}</h2>

      <h3
        ref={promptRef}
        tabIndex={-1}
        lang={japanese ? 'ja' : 'en'}
        className={`scroll-mt-40 py-4 text-h2 leading-relaxed outline-none focus-visible:focus-ring ${japanese ? 'font-japanese' : ''}`}>
        {source}
      </h3>

      {free && (
        <p className="text-body-sm text-muted-foreground">
          AI checks your Japanese response and provides feedback.
        </p>
      )}

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();

          if (!composing) void store.submitAnswer();
        }}>
        <fieldset disabled={store.answerLocked || store.isSubmitting} className="min-w-0 space-y-4">
          <legend className="sr-only">Your answer</legend>

          {slot && (
            <fieldset className="space-y-3">
              <legend className="sr-only">Answer options</legend>

              {q.promptPayload.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border p-4 focus-within:focus-ring ${store.selectedOptionId === option.id ? 'border-primary bg-secondary' : 'border-border-strong'}`}>
                  <input
                    type="radio"
                    name="practice-answer"
                    value={option.id}
                    checked={store.selectedOptionId === option.id}
                    onChange={() => store.selectOption(option.id)}
                    className="size-4 shrink-0 accent-primary"
                  />

                  <span lang="ja" className="font-japanese">
                    {option.label}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {arrange && (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-body-sm font-semibold">Answer order</p>

                <ol
                  aria-label="Answer order"
                  className="flex min-h-16 flex-wrap gap-2 rounded-md border border-border-strong bg-secondary p-3">
                  {store.arrangedTokenIds.map((id, index) => (
                    <li key={id}>
                      <Button
                        type="button"
                        variant="secondary"
                        aria-label={`Remove token ${index + 1}: ${q.promptPayload.arrangeTokens.find((t) => t.id === id)?.label}`}
                        onClick={() => store.toggleToken(id)}
                        className="h-auto min-h-11 font-japanese whitespace-normal">
                        {q.promptPayload.arrangeTokens.find((t) => t.id === id)?.label}
                      </Button>
                    </li>
                  ))}
                </ol>

                <p className="mt-2 text-body-sm text-muted-foreground">
                  Select a token to add it. Select it in the answer to remove it.
                </p>
              </div>

              <div role="group" aria-label="Available tokens" className="flex flex-wrap gap-2">
                {q.promptPayload.arrangeTokens
                  .filter((t) => !store.arrangedTokenIds.includes(t.id))
                  .map((token) => (
                    <Button
                      type="button"
                      variant="secondary"
                      key={token.id}
                      onClick={() => store.toggleToken(token.id)}
                      className="h-auto min-h-11 font-japanese whitespace-normal">
                      {token.label}
                    </Button>
                  ))}
              </div>

              <p className="text-body-sm text-muted-foreground">
                Answer in {q.promptPayload.answerLanguage === 'JA' ? 'Japanese' : 'English'}.
              </p>
            </div>
          )}

          {(short || free) && (
            <>
              <label className="block space-y-2">
                <span className="text-body-sm font-semibold">Romaji or Japanese answer</span>

                {free ? (
                  <textarea
                    maxLength={2000}
                    rows={3}
                    value={store.textInput}
                    onChange={(e) => store.setTextInput(e.target.value)}
                    onCompositionStart={() => setComposing(true)}
                    onCompositionEnd={() => setComposing(false)}
                    className={fieldClass}
                    aria-describedby="practice-input-hint"
                  />
                ) : (
                  <input
                    maxLength={2000}
                    value={store.textInput}
                    onChange={(e) => store.setTextInput(e.target.value)}
                    onCompositionStart={() => setComposing(true)}
                    onCompositionEnd={() => setComposing(false)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) e.stopPropagation();
                    }}
                    className={fieldClass}
                    aria-describedby="practice-input-hint"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                )}
              </label>

              <p id="practice-input-hint" className="text-body-sm text-muted-foreground">
                Romaji is converted to kana below. Use uppercase romaji for katakana. Check the
                Japanese answer before submitting; you can edit it with your Japanese keyboard.
              </p>

              <label className="block space-y-2">
                <span className="text-body-sm font-semibold">Japanese answer to submit</span>

                <input
                  lang="ja"
                  maxLength={2000}
                  value={store.japaneseAnswer}
                  onChange={(e) => store.setJapaneseAnswer(e.target.value)}
                  onCompositionStart={() => setComposing(true)}
                  onCompositionEnd={() => setComposing(false)}
                  className={fieldClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              {/[a-z]/i.test(store.japaneseAnswer) && (
                <p className="text-body-sm">
                  Finish converting the remaining romaji before submitting.
                </p>
              )}
            </>
          )}
        </fieldset>

        {store.stage === 'question' &&
          !(store.mode === 'lesson' && store.error?.code === 142206002) && (
            <Button type="submit" disabled={!store.canSubmit || composing}>
              {store.isSubmitting
                ? 'Checking answer…'
                : store.answerLocked
                  ? 'Retry answer'
                  : 'Check answer'}
            </Button>
          )}
      </form>

      {store.error &&
        store.answerLocked &&
        !store.accessIssue &&
        !(store.mode === 'lesson' && store.error.code === 142206002) && (
          <p className="text-body-sm text-muted-foreground">
            Your answer is kept. Retry the same answer to confirm the saved result.
          </p>
        )}
    </section>
  );
});
