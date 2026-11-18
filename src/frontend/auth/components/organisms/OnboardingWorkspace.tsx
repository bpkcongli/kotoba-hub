'use client';

import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { AppShell, PublicHeader } from '@/frontend/shared/components/layouts';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';

export const OnboardingWorkspace = observer(function OnboardingWorkspace({
  children,
}: {
  children: ReactNode;
}) {
  const t = useUiTranslations();

  const router = useRouter();
  const store = useAppSessionStore();
  const session = store.snapshot;

  useEffect(() => {
    if (!session) return;

    if (!session.isAuthenticated) {
      router.replace('/login');
      router.refresh();
    } else if (session.authorization.appAccess === 'APP_READY') {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [session, router]);

  return (
    <AppShell
      variant="onboarding"
      header={
        <PublicHeader
          actions={
            session?.isAuthenticated && (
              <Button
                variant="ghost"
                disabled={store.isSigningOut}
                onClick={() => void store.signOut()}>
                {store.isSigningOut
                  ? t('SHARED:APP_WORKSPACE.SIGN_OUT_BUTTON.LOADING_LABEL')
                  : t('SHARED:APP_WORKSPACE.SIGN_OUT_BUTTON.LABEL')}
              </Button>
            )
          }
        />
      }>
      {store.error && (
        <div className="mb-6">
          <ErrorStatePanel
            title={t('AUTH:ONBOARDING_WORKSPACE.SESSION_ERROR.TITLE')}
            description={errorMessage(store.error, t)}
            action={
              <Button
                variant="secondary"
                onClick={() => void store.load()}
                disabled={store.isLoading}>
                {t('AUTH:ONBOARDING_WORKSPACE.CHECK_SESSION_BUTTON.LABEL')}
              </Button>
            }
          />
        </div>
      )}

      {session?.authorization.appAccess === 'ONBOARDING_REQUIRED' ? (
        <fieldset disabled={store.isSigningOut} aria-busy={store.isSigningOut} className="min-w-0">
          {children}
        </fieldset>
      ) : (
        <LoadingPanel
          label={
            store.isSigningOut
              ? t('SHARED:APP_WORKSPACE.SIGN_OUT_BUTTON.LOADING_LABEL')
              : t('AUTH:LOGIN_SCREEN.WORKSPACE.REDIRECTING_LABEL')
          }
        />
      )}
    </AppShell>
  );
});
