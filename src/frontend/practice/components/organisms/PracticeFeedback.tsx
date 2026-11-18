'use client';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { MASTERY_MESSAGE_KEYS, skillLabel } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { LessonRichText } from '@/frontend/syllabus/components/organisms';
import { uiTranslator } from '@/shared/i18n';

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

  const t = uiTranslator(locale);

  return (
    <section
      lang={locale}
      ref={ref}
      tabIndex={-1}
      aria-label={t('PRACTICE:ANSWER_FEEDBACK.PANEL.ARIA_LABEL')}
      className="scroll-mt-40 space-y-4 rounded-md border border-border-strong bg-secondary p-5 outline-none focus-visible:focus-ring sm:p-8">
      <h2 className="text-h3 font-semibold">
        {result.isCorrect
          ? t('SHARED:ANSWER_STATUS.CORRECT.LABEL')
          : t('PRACTICE:ANSWER_FEEDBACK.INCORRECT_RESULT.LABEL')}
      </h2>

      <p>
        {t('PRACTICE:ANSWER_FEEDBACK.ANSWER_SCORE.LABEL')}: {result.numericScore}/100
      </p>

      {result.feedbackText &&
        (store.mode === 'lesson' && store.lessonResult?.localization ? (
          <LessonRichText
            html={result.feedbackText}
            locale={store.lessonResult.localization.resolvedLocale}
          />
        ) : (
          <p lang={locale} className="whitespace-pre-wrap">
            {result.feedbackText}
          </p>
        ))}

      <p className="text-body-sm text-muted-foreground">
        {result.gradingSource === 'AI_PROVIDER'
          ? t('PRACTICE:ANSWER_FEEDBACK.AI_EVALUATION.LABEL')
          : t('PRACTICE:ANSWER_FEEDBACK.OBJECTIVE_EVALUATION.LABEL')}
      </p>

      {result.progressImpact ? (
        <p className="text-body-sm">
          {t('PRACTICE:ANSWER_FEEDBACK.SKILL.LABEL')}: {skillLabel(result.progressImpact.skillCode)}{' '}
          · {t('PRACTICE:ANSWER_FEEDBACK.MASTERY.LABEL')} {result.progressImpact.masteryScore}/100 ·{' '}
          {t(MASTERY_MESSAGE_KEYS[result.progressImpact.masteryState])}
        </p>
      ) : (
        <p className="text-body-sm">
          {t('PRACTICE:ANSWER_FEEDBACK.SAVED_ANSWER_NOTICE.DESCRIPTION')}
        </p>
      )}
    </section>
  );
});
