'use client';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { LessonRichText } from '@/frontend/syllabus/components/organisms';

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

  const locale =
    store.mode === 'lesson'
      ? (store.lessonQuiz?.question.localization?.resolvedLocale ?? 'en')
      : (store.session?.language?.instructionLocale ?? 'en');

  const t = (en: string, id: string) => (locale === 'id' ? id : en);

  const sourceLocale = japanese ? 'ja' : q.promptPayload.promptLanguage === 'ID' ? 'id' : 'en';
  const answerLocale =
    'answerLanguage' in q.promptPayload
      ? q.promptPayload.answerLanguage === 'JA'
        ? 'ja'
        : q.promptPayload.answerLanguage === 'ID'
          ? 'id'
          : 'en'
      : 'ja';

  const title = short
    ? t('Fill in the missing kana', 'Isi kana yang kosong')
    : slot
      ? t('Choose the missing word', 'Pilih kata yang tepat')
      : arrange
        ? t('Arrange the sentence', 'Susun kalimat')
        : t('Write the sentence in Japanese', 'Tulis kalimat dalam bahasa Jepang');

  return (
    <section
      lang={locale}
      aria-label={
        store.mode === 'lesson'
          ? t('Lesson question', 'Soal materi')
          : t('Practice question', 'Soal latihan')
      }
      className="min-w-0 space-y-6 rounded-md border border-border-subtle bg-card p-5 wrap-anywhere sm:p-8">
      <h2 className="text-h3 font-semibold">{title}</h2>

      {(arrange || free) && (
        <p className="text-body-sm text-muted-foreground">
          {locale === 'id'
            ? `Terjemahkan dari bahasa ${sourceLocale === 'ja' ? 'Jepang' : sourceLocale === 'id' ? 'Indonesia' : 'Inggris'} ke bahasa ${answerLocale === 'ja' ? 'Jepang' : answerLocale === 'id' ? 'Indonesia' : 'Inggris'}.`
            : `Translate from ${sourceLocale === 'ja' ? 'Japanese' : sourceLocale === 'id' ? 'Indonesian' : 'English'} to ${answerLocale === 'ja' ? 'Japanese' : answerLocale === 'id' ? 'Indonesian' : 'English'}.`}
        </p>
      )}

      <h3
        ref={promptRef}
        tabIndex={-1}
        lang={sourceLocale}
        className={`scroll-mt-40 py-4 text-h2 leading-relaxed outline-none focus-visible:focus-ring ${japanese ? 'font-japanese' : ''}`}>
        {source}
      </h3>

      {store.mode === 'lesson' &&
        short &&
        store.lessonQuiz?.question.promptPayload.hintTexts?.map((hint, index) => (
          <LessonRichText
            key={index}
            html={hint}
            locale={store.lessonQuiz?.question.localization?.resolvedLocale}
          />
        ))}

      {free && (
        <p className="text-body-sm text-muted-foreground">
          {t(
            'AI checks your Japanese response and provides feedback.',
            'AI memeriksa jawaban bahasa Jepangmu dan memberikan umpan balik.',
          )}
        </p>
      )}

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();

          if (!composing) void store.submitAnswer();
        }}>
        <fieldset disabled={store.answerLocked || store.isSubmitting} className="min-w-0 space-y-4">
          <legend className="sr-only">{t('Your answer', 'Jawabanmu')}</legend>

          {slot && (
            <fieldset className="space-y-3">
              <legend className="sr-only">{t('Answer options', 'Pilihan jawaban')}</legend>

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
                <p className="mb-3 text-body-sm font-semibold">
                  {t('Answer order', 'Urutan jawaban')}
                </p>

                <ol
                  aria-label={t('Answer order', 'Urutan jawaban')}
                  className="flex min-h-16 flex-wrap gap-2 rounded-md border border-border-strong bg-secondary p-3">
                  {store.arrangedTokenIds.map((id, index) => (
                    <li key={id}>
                      <Button
                        type="button"
                        variant="secondary"
                        aria-label={`${t('Remove token', 'Hapus token')} ${index + 1}: ${q.promptPayload.arrangeTokens.find((t) => t.id === id)?.label}`}
                        onClick={() => store.toggleToken(id)}
                        lang={answerLocale}
                        className={`h-auto min-h-11 whitespace-normal ${answerLocale === 'ja' ? 'font-japanese' : ''}`}>
                        {q.promptPayload.arrangeTokens.find((t) => t.id === id)?.label}
                      </Button>
                    </li>
                  ))}
                </ol>

                <p className="mt-2 text-body-sm text-muted-foreground">
                  {t(
                    'Select a token to add it. Select it in the answer to remove it.',
                    'Pilih token untuk menambahkannya. Pilih token dalam jawaban untuk menghapusnya.',
                  )}
                </p>
              </div>

              <div
                role="group"
                aria-label={t('Available tokens', 'Token tersedia')}
                className="flex flex-wrap gap-2">
                {q.promptPayload.arrangeTokens
                  .filter((t) => !store.arrangedTokenIds.includes(t.id))
                  .map((token) => (
                    <Button
                      type="button"
                      variant="secondary"
                      key={token.id}
                      onClick={() => store.toggleToken(token.id)}
                      lang={answerLocale}
                      className={`h-auto min-h-11 whitespace-normal ${answerLocale === 'ja' ? 'font-japanese' : ''}`}>
                      {token.label}
                    </Button>
                  ))}
              </div>

              <p className="text-body-sm text-muted-foreground">
                {t('Answer in ', 'Jawab dalam bahasa ')}
                {answerLocale === 'ja'
                  ? t('Japanese', 'Jepang')
                  : answerLocale === 'id'
                    ? t('Indonesian', 'Indonesia')
                    : t('English', 'Inggris')}
                .
              </p>
            </div>
          )}

          {(short || free) && (
            <>
              <label className="block space-y-2">
                <span className="text-body-sm font-semibold">
                  {t('Romaji or Japanese answer', 'Jawaban romaji atau Jepang')}
                </span>

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
                {t(
                  'Romaji is converted to kana below. Use uppercase romaji for katakana. Check the Japanese answer before submitting; you can edit it with your Japanese keyboard.',
                  'Romaji diubah menjadi kana di bawah. Gunakan huruf besar untuk katakana. Periksa jawaban Jepang sebelum mengirim; kamu dapat mengeditnya dengan papan ketik Jepang.',
                )}
              </p>

              <label className="block space-y-2">
                <span className="text-body-sm font-semibold">
                  {t('Japanese answer to submit', 'Jawaban Jepang yang akan dikirim')}
                </span>

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
                  {t(
                    'Finish converting the remaining romaji before submitting.',
                    'Ubah sisa romaji sebelum mengirim jawaban.',
                  )}
                </p>
              )}
            </>
          )}
        </fieldset>

        {store.stage === 'question' &&
          !(store.mode === 'lesson' && store.error?.code === 142206002) && (
            <Button type="submit" disabled={!store.canSubmit || composing}>
              {store.isSubmitting
                ? t('Checking answer…', 'Memeriksa jawaban…')
                : store.answerLocked
                  ? t('Retry answer', 'Kirim ulang jawaban')
                  : t('Check answer', 'Periksa jawaban')}
            </Button>
          )}
      </form>

      {store.error &&
        store.answerLocked &&
        !store.accessIssue &&
        !(store.mode === 'lesson' && store.error.code === 142206002) && (
          <p className="text-body-sm text-muted-foreground">
            {t(
              'Your answer is kept. Retry the same answer to confirm the saved result.',
              'Jawabanmu disimpan. Kirim ulang jawaban yang sama untuk memastikan hasilnya.',
            )}
          </p>
        )}
    </section>
  );
});
