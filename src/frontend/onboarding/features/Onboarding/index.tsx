'use client';

import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { AssessmentForm, AssessmentReview } from '@/frontend/onboarding/components/organisms';
import { levelLabel } from '@/frontend/onboarding/helpers';
import { useOnboardingStore } from '@/frontend/onboarding/hooks';
import { OnboardingContainerProvider } from '@/frontend/onboarding/providers';
import { Button } from '@/frontend/shared/components/atoms';
import {
  EmptyStatePanel,
  ErrorStatePanel,
  LoadingPanel,
} from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';

export const OnboardingWizard = observer(function OnboardingWizard() {
  const t = useUiTranslations();
  const uiLocale = useLocale() === 'id' ? 'id' : 'en';

  const store = useOnboardingStore();
  const session = useAppSessionStore();
  const router = useRouter();

  const heading = useRef<HTMLHeadingElement>(null);
  const [syncingSession, setSyncingSession] = useState(false);

  useEffect(() => {
    void store.load();

    return () => store.dispose();
  }, [store]);

  useEffect(() => {
    if (store.isLoaded) heading.current?.focus();
  }, [store.step, store.isLoaded]);

  useEffect(() => {
    if (!store.sessionExpired) return;

    let active = true;

    void session.load().then(() => {
      if (active && session.snapshot?.authorization.appAccess === 'ANONYMOUS') {
        router.replace('/login');
        router.refresh();
      }
    });

    return () => {
      active = false;
    };
  }, [store.sessionExpired, session, router]);

  async function continueToDashboard() {
    setSyncingSession(true);
    await session.load();
    setSyncingSession(false);

    if (session.snapshot?.authorization.appAccess === 'APP_READY') {
      router.replace('/dashboard');
      router.refresh();
    }
  }

  async function confirm() {
    if (await store.confirm()) await continueToDashboard();
  }

  if (store.isLoading || (!store.isLoaded && !store.error))
    return <LoadingPanel label={t('ONBOARDING:ONBOARDING_SCREEN.CATALOG.LOADING_LABEL')} />;

  if ((!store.isLoaded || store.tracks.length === 0) && store.error)
    return (
      <ErrorStatePanel
        title={t('ONBOARDING:ONBOARDING_SCREEN.CATALOG_ERROR.TITLE')}
        description={errorMessage(store.error, t)}
        action={
          <Button onClick={() => void store.load()}>
            {t('SHARED:RECOVERY_ACTIONS.RETRY_BUTTON.LABEL')}
          </Button>
        }
      />
    );

  if (store.tracks.length === 0)
    return (
      <EmptyStatePanel
        title={t('ONBOARDING:ONBOARDING_SCREEN.EMPTY_CATALOG.TITLE')}
        description={t('ONBOARDING:ONBOARDING_SCREEN.EMPTY_CATALOG.DESCRIPTION')}
        action={
          <Button onClick={() => void store.load()}>
            {t('ONBOARDING:ONBOARDING_SCREEN.RELOAD_CATALOG_BUTTON.LABEL')}
          </Button>
        }
      />
    );

  return (
    <div className="space-y-8">
      <ol
        aria-label={t('ONBOARDING:ONBOARDING_SCREEN.STEP_LIST.ARIA_LABEL')}
        className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border-subtle pb-4 text-body-sm">
        <li
          aria-current={store.step === 'assessment' ? 'step' : undefined}
          className={store.step === 'assessment' ? 'font-semibold' : 'text-muted-foreground'}>
          {t('ONBOARDING:ONBOARDING_SCREEN.STEP_LIST.ASSESSMENT_LABEL')}
        </li>
        <li
          aria-current={store.step === 'review' ? 'step' : undefined}
          className={store.step === 'review' ? 'font-semibold' : 'text-muted-foreground'}>
          {t('ONBOARDING:ONBOARDING_SCREEN.STEP_LIST.REVIEW_LABEL')}
        </li>
      </ol>

      <div className="space-y-3">
        <h1 ref={heading} tabIndex={-1} className="text-h2 font-semibold outline-none sm:text-h1">
          {store.step === 'complete'
            ? t('ONBOARDING:ONBOARDING_SCREEN.PAGE.COMPLETED_TITLE')
            : store.step === 'review'
              ? t('ONBOARDING:ONBOARDING_SCREEN.PAGE.REVIEW_TITLE')
              : t('ONBOARDING:ONBOARDING_SCREEN.PAGE.ASSESSMENT_TITLE')}
        </h1>

        <p className="text-muted-foreground">
          {store.step === 'complete'
            ? t('ONBOARDING:ONBOARDING_SCREEN.PAGE.COMPLETED_DESCRIPTION')
            : store.step === 'review'
              ? t('ONBOARDING:ONBOARDING_SCREEN.PAGE.REVIEW_DESCRIPTION')
              : t('ONBOARDING:ONBOARDING_SCREEN.PAGE.ASSESSMENT_DESCRIPTION')}
        </p>
      </div>

      {store.error && (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-destructive bg-error-bg p-4 text-body-sm">
          <p>
            {store.sessionExpired
              ? t('ONBOARDING:ONBOARDING_SCREEN.EXPIRED_SESSION_NOTICE.DESCRIPTION')
              : errorMessage(store.error, t)}
          </p>

          {store.error.fieldErrors
            .filter((detail) => !Object.hasOwn(store.formData, detail.field))
            .map((detail, index) => (
              <p key={`${detail.field}-${index}`}>{detail.message}</p>
            ))}

          {store.error.traceId && (
            <p className="text-caption break-all">
              {t('SHARED:ERROR_DETAILS.TRACE_REFERENCE.LABEL')} {store.error.traceId}
            </p>
          )}

          {store.step === 'assessment' && store.formData.note.trim() && (
            <p>{t('ONBOARDING:ONBOARDING_SCREEN.ASSESSMENT_ERROR.NOTE_RETRY_HINT')}</p>
          )}
        </div>
      )}

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)]">
        <section
          aria-label={
            store.step === 'review'
              ? t('ONBOARDING:ONBOARDING_SCREEN.REVIEW_STEP.LABEL')
              : t('ONBOARDING:ONBOARDING_SCREEN.ASSESSMENT_STEP.LABEL')
          }
          className="min-w-0">
          {store.step === 'complete' ? (
            <div className="space-y-4" aria-live="polite">
              <p>
                {syncingSession
                  ? t('ONBOARDING:ONBOARDING_SCREEN.SESSION_SYNC.LOADING_LABEL')
                  : session.error
                    ? t('ONBOARDING:ONBOARDING_SCREEN.SESSION_SYNC.ERROR_MESSAGE')
                    : t('ONBOARDING:ONBOARDING_SCREEN.COMPLETED_PROFILE.DESCRIPTION')}
              </p>

              <Button onClick={() => void continueToDashboard()} disabled={syncingSession}>
                {syncingSession
                  ? t('ONBOARDING:ONBOARDING_SCREEN.CONTINUE_TO_DASHBOARD_BUTTON.LOADING_LABEL')
                  : t('ONBOARDING:ONBOARDING_SCREEN.CONTINUE_TO_DASHBOARD_BUTTON.LABEL')}
              </Button>
            </div>
          ) : store.step === 'review' ? (
            <AssessmentReview onConfirm={() => void confirm()} />
          ) : (
            <AssessmentForm />
          )}
        </section>

        <aside
          aria-label={t('ONBOARDING:ONBOARDING_SCREEN.STUDY_PLAN_SECTION.TITLE')}
          className="min-w-0 space-y-3 self-start rounded-md bg-secondary p-5 text-body-sm">
          <h2 className="font-semibold">
            {store.result
              ? t('ONBOARDING:ONBOARDING_SCREEN.STARTING_POINT_SECTION.TITLE')
              : t('ONBOARDING:ONBOARDING_SCREEN.CONFIRMATION_NOTICE.TITLE')}
          </h2>

          {store.result ? (
            <p className="text-muted-foreground">
              {t('ONBOARDING:ONBOARDING_SCREEN.STARTING_TRACK.PREFIX')}{' '}
              {store.tracks.find(
                (track) => track.slug === store.result?.recommendation.recommendedTrackSlug,
              )?.title ?? levelLabel(store.result.draftProfile.targetLevel, uiLocale)}
              {t('ONBOARDING:ONBOARDING_SCREEN.STARTING_TRACK.DESCRIPTION')}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {t('ONBOARDING:ONBOARDING_SCREEN.DRAFT_NOTICE.DESCRIPTION')}
            </p>
          )}

          <p className="text-muted-foreground">
            {t('ONBOARDING:ONBOARDING_SCREEN.DAILY_GOAL_NOTICE.DESCRIPTION')}
          </p>
        </aside>
      </div>
    </div>
  );
});

export function Onboarding() {
  return (
    <OnboardingContainerProvider>
      <OnboardingWizard />
    </OnboardingContainerProvider>
  );
}
