'use client';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { MASTERY_LABELS, skillLabel } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { LessonRichText } from '@/frontend/syllabus/components/organisms';

export const PracticeFeedback = observer(function PracticeFeedback() {
  const store = usePracticeStore();
  const result = store.mode === 'lesson' ? store.lessonResult : store.answerResult;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (result) ref.current?.focus();
  }, [result]);

  if (!result) return null;

  const locale =
    store.mode === 'lesson'
      ? (store.lessonResult?.localization?.resolvedLocale ?? 'en')
      : (store.answerResult?.language?.feedbackLocale ?? 'en');

  const t = (en: string, id: string) => (locale === 'id' ? id : en);

  return (
    <section
      lang={locale}
      ref={ref}
      tabIndex={-1}
      aria-label={t('Answer feedback', 'Umpan balik jawaban')}
      className="scroll-mt-40 space-y-4 rounded-md border border-border-strong bg-secondary p-5 outline-none focus-visible:focus-ring sm:p-8">
      <h2 className="text-h3 font-semibold">
        {result.isCorrect ? t('Correct', 'Benar') : t('Not quite', 'Belum tepat')}
      </h2>

      <p>
        {t('Score', 'Nilai')}: {result.numericScore}/100
      </p>

      {result.feedbackText &&
        (store.mode === 'lesson' && store.lessonResult?.localization ? (
          <LessonRichText
            html={result.feedbackText}
            locale={store.lessonResult.localization.resolvedLocale}
          />
        ) : (
          <p className="whitespace-pre-wrap">{result.feedbackText}</p>
        ))}

      <p className="text-body-sm text-muted-foreground">
        {result.gradingSource === 'AI_PROVIDER'
          ? t('AI feedback', 'Umpan balik AI')
          : t('Checked against the accepted answer', 'Diperiksa berdasarkan jawaban yang diterima')}
      </p>

      {result.progressImpact ? (
        <p className="text-body-sm">
          {t('Skill', 'Keterampilan')}: {skillLabel(result.progressImpact.skillCode)} ·{' '}
          {t('Mastery', 'Penguasaan')} {result.progressImpact.masteryScore}/100 ·{' '}
          {locale === 'id'
            ? {
                WEAK: 'Perlu diulang',
                DEVELOPING: 'Berkembang',
                STABLE: 'Stabil',
                MASTERED: 'Dikuasai',
              }[result.progressImpact.masteryState]
            : MASTERY_LABELS[result.progressImpact.masteryState]}
        </p>
      ) : (
        <p className="text-body-sm">
          {t(
            'Your answer is saved. No syllabus mastery update was returned.',
            'Jawabanmu tersimpan. Tidak ada pembaruan penguasaan syllabus yang diterima.',
          )}
        </p>
      )}
    </section>
  );
});
