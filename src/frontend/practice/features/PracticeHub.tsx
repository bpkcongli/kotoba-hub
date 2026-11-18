'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PracticeError } from '@/frontend/practice/components/organisms';
import { DIFFICULTY_MESSAGE_KEYS } from '@/frontend/practice/helpers';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export const PracticeHub = observer(function PracticeHub() {
  const t = useUiTranslations();

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
        <h1 className="text-h1 font-semibold">{t('SHARED:APP_NAVIGATION.PRACTICE_LINK.LABEL')}</h1>

        <p className="text-muted-foreground">{t('PRACTICE:PRACTICE_HUB.PAGE.DESCRIPTION')}</p>
      </header>

      {store.session && (
        <section className="space-y-3 rounded-md border bg-card p-5">
          <h2 className="text-h3 font-semibold">
            {store.session.status === 'COMPLETED'
              ? t('PRACTICE:PRACTICE_HUB.PREVIOUS_SESSION.TITLE')
              : t('PRACTICE:PRACTICE_HUB.ACTIVE_SESSION.TITLE')}
          </h2>

          <p>
            {store.session.answeredQuestionsCount}{' '}
            {t('SHARED:LEARNING_STATUS.ANSWER_PROGRESS.CONNECTOR')} {store.session.totalQuestions}{' '}
            {t('SHARED:LEARNING_STATUS.ANSWERED.UNIT_LABEL')}
          </p>

          <p className="text-body-sm text-muted-foreground">
            {t('PRACTICE:PRACTICE_HUB.SESSION_DIFFICULTY.LABEL')}{' '}
            {t(DIFFICULTY_MESSAGE_KEYS[store.session.difficultyBand])}
          </p>

          <p className="text-body-sm text-muted-foreground">
            {t('PRACTICE:PRACTICE_HUB.QUESTION_MIX.LABEL')}{' '}
            {Math.round(store.session.questionMix.WEAK * 100)}
            {t('PRACTICE:PRACTICE_HUB.QUESTION_MIX.WEAK_SKILLS_UNIT')}{' '}
            {Math.round(store.session.questionMix.REINFORCEMENT * 100)}
            {t('PRACTICE:PRACTICE_HUB.QUESTION_MIX.REINFORCEMENT_UNIT')}{' '}
            {Math.round(store.session.questionMix.STRETCH * 100)}
            {t('PRACTICE:PRACTICE_HUB.QUESTION_MIX.STRETCH_UNIT')}
          </p>

          <Button asChild variant="secondary">
            <Link
              href={`/practice/sessions/${store.session.id}${store.stage === 'completed' ? '/summary' : ''}`}>
              {store.stage === 'completed'
                ? t('SHARED:LEARNING_ACTIONS.VIEW_SUMMARY_BUTTON.LABEL')
                : t('PRACTICE:PRACTICE_HUB.RETURN_TO_SESSION_BUTTON.LABEL')}
            </Link>
          </Button>
        </section>
      )}

      <section className="space-y-5 rounded-md border border-border-subtle bg-card p-5 sm:p-8">
        <h2 className="text-h3 font-semibold">{t('PRACTICE:PRACTICE_HUB.SESSION_SETUP.TITLE')}</h2>

        <p className="text-body-sm text-muted-foreground">
          {t('PRACTICE:PRACTICE_HUB.SESSION_SETUP.DESCRIPTION')}
        </p>

        <label className="block space-y-2">
          <span className="text-body-sm font-semibold">
            {t('PRACTICE:PRACTICE_HUB.QUESTION_COUNT_FIELD.LABEL')}
          </span>

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

        {!countValid && (
          <p className="text-body-sm">
            {t('PRACTICE:PRACTICE_HUB.QUESTION_COUNT_FIELD.VALIDATION_MESSAGE')}
          </p>
        )}

        <Button
          onClick={() => void start()}
          disabled={store.isGenerating || !!store.accessIssue || !countValid}>
          {store.isGenerating
            ? t('PRACTICE:PRACTICE_HUB.START_PRACTICE_BUTTON.LOADING_LABEL')
            : t('PRACTICE:PRACTICE_HUB.START_PRACTICE_BUTTON.LABEL')}
        </Button>
      </section>

      <PracticeError title={t('PRACTICE:PRACTICE_HUB.SESSION_ERROR.TITLE')} />
    </div>
  );
});
