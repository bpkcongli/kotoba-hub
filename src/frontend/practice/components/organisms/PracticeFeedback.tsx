'use client';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { MASTERY_LABELS, skillLabel } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';

export const PracticeFeedback = observer(function PracticeFeedback() {
  const store = usePracticeStore();
  const result = store.mode === 'lesson' ? store.lessonResult : store.answerResult;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (result) ref.current?.focus();
  }, [result]);

  if (!result) return null;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label="Answer feedback"
      className="scroll-mt-40 space-y-4 rounded-md border border-border-strong bg-secondary p-5 outline-none focus-visible:focus-ring sm:p-8">
      <h2 className="text-h3 font-semibold">{result.isCorrect ? 'Correct' : 'Not quite'}</h2>

      <p>Score: {result.numericScore}/100</p>

      {result.feedbackText && <p className="whitespace-pre-wrap">{result.feedbackText}</p>}

      <p className="text-body-sm text-muted-foreground">
        {result.gradingSource === 'AI_PROVIDER'
          ? 'AI feedback'
          : 'Checked against the accepted answer'}
      </p>

      {result.progressImpact ? (
        <p className="text-body-sm">
          Skill: {skillLabel(result.progressImpact.skillCode)} · Mastery{' '}
          {result.progressImpact.masteryScore}/100 ·{' '}
          {MASTERY_LABELS[result.progressImpact.masteryState]}
        </p>
      ) : (
        <p className="text-body-sm">
          Your answer is saved. No syllabus mastery update was returned.
        </p>
      )}
    </section>
  );
});
