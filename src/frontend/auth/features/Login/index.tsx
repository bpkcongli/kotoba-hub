'use client';

import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { AppShell, PublicHeader } from '@/frontend/shared/components/layouts';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';

export interface LoginProps {
  redirectTo?: string;
  hasError?: boolean;
}

export const Login = observer(function Login({
  redirectTo = '/dashboard',
  hasError = false,
}: LoginProps) {
  const t = useUiTranslations();

  const router = useRouter();
  const sessionStore = useAppSessionStore();
  const session = sessionStore.snapshot;

  useEffect(() => {
    if (!session?.isAuthenticated) return;

    router.replace(
      session.authorization.appAccess === 'ONBOARDING_REQUIRED' ? '/onboarding' : redirectTo,
    );
    router.refresh();
  }, [session, router, redirectTo]);

  return (
    <AppShell variant="public" header={<PublicHeader />} contentWidth="reading">
      <section aria-labelledby="login-heading" className="mx-auto max-w-lg py-8 md:py-16">
        <h1 id="login-heading" className="text-h1 font-bold tracking-tight">
          {t('AUTH:LOGIN_SCREEN.PAGE.TITLE')}
        </h1>

        <p className="mt-4 text-body text-muted-foreground">
          {t('AUTH:LOGIN_SCREEN.PAGE.DESCRIPTION')}
        </p>

        <div className="mt-8 space-y-6">
          {!session ? (
            sessionStore.error ? (
              <ErrorStatePanel
                title={t('AUTH:LOGIN_SCREEN.SESSION_ERROR.TITLE')}
                description={errorMessage(sessionStore.error, t)}
                action={
                  <Button
                    onClick={() => void sessionStore.load()}
                    disabled={sessionStore.isLoading}>
                    {t('SHARED:RECOVERY_ACTIONS.RETRY_BUTTON.LABEL')}
                  </Button>
                }
              />
            ) : (
              <LoadingPanel label={t('AUTH:LOGIN_SCREEN.SESSION.LOADING_LABEL')} />
            )
          ) : session.isAuthenticated ? (
            <LoadingPanel label={t('AUTH:LOGIN_SCREEN.WORKSPACE.REDIRECTING_LABEL')} />
          ) : (
            <>
              {hasError && (
                <ErrorStatePanel
                  title={t('AUTH:LOGIN_SCREEN.SIGN_IN_ERROR.TITLE')}
                  description={t('AUTH:LOGIN_SCREEN.SIGN_IN_ERROR.DESCRIPTION')}
                />
              )}

              <form
                method="post"
                action={`/api/v1/auth/google/start?${new URLSearchParams({ redirectTo }).toString()}`}>
                <Button type="submit" className="w-full">
                  {t('AUTH:LOGIN_SCREEN.GOOGLE_SIGN_IN_BUTTON.LABEL')}
                </Button>
              </form>

              <p className="text-body-sm text-muted-foreground">
                {t('AUTH:LOGIN_SCREEN.GOOGLE_SIGN_IN_BUTTON.HELP_TEXT')}
              </p>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
});
