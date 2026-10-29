'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PracticeError } from '@/frontend/practice/components/organisms';
import { DIFFICULTY_LABELS } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button } from '@/frontend/shared/components/atoms';

export const PracticeHub = observer(function PracticeHub() {
  const store = usePracticeStore();
  const router = useRouter();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const [countInput, setCountInput] = useState(String(store.questionCount));
  const countValid =
    /^\d+$/.test(countInput) && Number(countInput) >= 1 && Number(countInput) <= 10;

  async function start() {
    const session = await store.generateSession();

    if (mounted.current && session) router.push(`/practice/sessions/${session.id}`);
  }

  return (
    <div className="mx-auto max-w-reading min-w-0 space-y-8 wrap-anywhere">
      <header className="space-y-3">
        <h1 className="text-h1 font-semibold">Practice</h1>

        <p className="text-muted-foreground">
          Practice questions selected from your learning profile and recent progress.
        </p>
      </header>

      {store.session && (
        <section className="space-y-3 rounded-md border bg-card p-5">
          <h2 className="text-h3 font-semibold">
            {store.session.status === 'COMPLETED' ? 'Your last session' : 'Session in progress'}
          </h2>

          <p>
            {store.session.answeredQuestionsCount} of {store.session.totalQuestions} answered
          </p>

          <p className="text-body-sm text-muted-foreground">
            Session difficulty: {DIFFICULTY_LABELS[store.session.difficultyBand]}
          </p>

          <p className="text-body-sm text-muted-foreground">
            Question mix: {Math.round(store.session.questionMix.WEAK * 100)}% weak skills ·{' '}
            {Math.round(store.session.questionMix.REINFORCEMENT * 100)}% reinforcement ·{' '}
            {Math.round(store.session.questionMix.STRETCH * 100)}% stretch
          </p>

          <Button asChild variant="secondary">
            <Link
              href={`/practice/sessions/${store.session.id}${store.stage === 'completed' ? '/summary' : ''}`}>
              {store.stage === 'completed' ? 'View summary' : 'Return to session'}
            </Link>
          </Button>
        </section>
      )}

      <section className="space-y-5 rounded-md border border-border-subtle bg-card p-5 sm:p-8">
        <h2 className="text-h3 font-semibold">Start a practice session</h2>

        <p className="text-body-sm text-muted-foreground">
          Questions can include missing words, sentence ordering, and Japanese writing. Difficulty
          and the question mix are selected when your session is generated.
        </p>

        <label className="block space-y-2">
          <span className="text-body-sm font-semibold">Question count</span>

          <input
            type="number"
            min={1}
            max={10}
            value={countInput}
            disabled={store.isGenerating}
            onChange={(e) => {
              setCountInput(e.target.value);
              store.setQuestionCount(Number(e.target.value));
            }}
            className="block min-h-11 w-28 rounded-md border border-border-strong bg-background px-3 py-2 focus-visible:focus-ring"
          />
        </label>

        {!countValid && <p className="text-body-sm">Choose 1 to 10 questions.</p>}

        <Button
          onClick={() => void start()}
          disabled={store.isGenerating || !!store.accessIssue || !countValid}>
          {store.isGenerating ? 'Preparing questions…' : 'Generate practice'}
        </Button>
      </section>

      <PracticeError title="Your practice session could not be prepared" />
    </div>
  );
});
