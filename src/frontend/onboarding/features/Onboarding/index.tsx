'use client';

import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
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
import { useAppSessionStore } from '@/frontend/shared/hooks';

export const OnboardingWizard = observer(function OnboardingWizard() {
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
    return <LoadingPanel label="Loading available study levels…" />;

  if ((!store.isLoaded || store.tracks.length === 0) && store.error)
    return (
      <ErrorStatePanel
        title="Your assessment could not load"
        description={store.error.message}
        action={<Button onClick={() => void store.load()}>Try again</Button>}
      />
    );

  if (store.tracks.length === 0)
    return (
      <EmptyStatePanel
        title="No study levels are available yet"
        description="Your assessment needs a published syllabus. Try again after lessons have been added."
        action={<Button onClick={() => void store.load()}>Reload available levels</Button>}
      />
    );

  return (
    <div className="space-y-8">
      <ol
        aria-label="Onboarding steps"
        className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border-subtle pb-4 text-body-sm">
        <li
          aria-current={store.step === 'assessment' ? 'step' : undefined}
          className={store.step === 'assessment' ? 'font-semibold' : 'text-muted-foreground'}>
          1. Learning preferences
        </li>
        <li
          aria-current={store.step === 'review' ? 'step' : undefined}
          className={store.step === 'review' ? 'font-semibold' : 'text-muted-foreground'}>
          2. Review and confirm
        </li>
      </ol>

      <div className="space-y-3">
        <h1 ref={heading} tabIndex={-1} className="text-h2 font-semibold outline-none sm:text-h1">
          {store.step === 'complete'
            ? 'Your study plan is saved'
            : store.step === 'review'
              ? 'Review your study plan'
              : 'Set up your study plan'}
        </h1>

        <p className="text-muted-foreground">
          {store.step === 'complete'
            ? 'Your learning preferences have been confirmed.'
            : store.step === 'review'
              ? 'Check your preferences and suggested skills before saving your profile.'
              : 'Tell us where you are starting and what you want to work on.'}
        </p>
      </div>

      {store.error && (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-destructive bg-error-bg p-4 text-body-sm">
          <p>
            {store.sessionExpired
              ? 'Your session expired. Sign in again to continue.'
              : store.error.message}
          </p>
          {store.error.fieldErrors
            .filter((detail) => !Object.hasOwn(store.formData, detail.field))
            .map((detail, index) => (
              <p key={`${detail.field}-${index}`}>{detail.message}</p>
            ))}
          {store.error.traceId && (
            <p className="text-caption break-all">Reference: {store.error.traceId}</p>
          )}

          {store.step === 'assessment' && store.formData.note.trim() && (
            <p>You can remove your optional note and try again without AI.</p>
          )}
        </div>
      )}

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)]">
        <section
          aria-label={store.step === 'review' ? 'Draft review' : 'Learning preferences'}
          className="min-w-0">
          {store.step === 'complete' ? (
            <div className="space-y-4" aria-live="polite">
              <p>
                {syncingSession
                  ? 'Updating your session…'
                  : session.error
                    ? 'Your profile is saved, but your session could not refresh. Try continuing again.'
                    : 'Continue to your study workspace.'}
              </p>
              <Button onClick={() => void continueToDashboard()} disabled={syncingSession}>
                {syncingSession ? 'Continuing…' : 'Continue to dashboard'}
              </Button>
            </div>
          ) : store.step === 'review' ? (
            <AssessmentReview onConfirm={() => void confirm()} />
          ) : (
            <AssessmentForm />
          )}
        </section>

        <aside
          aria-label="About your study plan"
          className="min-w-0 space-y-3 self-start rounded-md bg-secondary p-5 text-body-sm">
          <h2 className="font-semibold">
            {store.result ? 'Your starting point' : 'Before you confirm'}
          </h2>

          {store.result ? (
            <p className="text-muted-foreground">
              Your starting track is{' '}
              {store.tracks.find(
                (track) => track.slug === store.result?.recommendation.recommendedTrackSlug,
              )?.title ?? levelLabel(store.result.draftProfile.targetLevel)}
              . Lesson recommendations use your confirmed preferences and measured progress.
            </p>
          ) : (
            <p className="text-muted-foreground">
              You will review a draft before anything is saved. An optional note can suggest known
              skills for you to keep or remove.
            </p>
          )}

          <p className="text-muted-foreground">
            Your daily goal is a preference. Your progress changes when you complete learning
            activities.
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
