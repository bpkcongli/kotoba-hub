'use client';

import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { AppShell, PublicHeader } from '@/frontend/shared/components/layouts';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { useAppSessionStore } from '@/frontend/shared/hooks';

export interface LoginProps {
  redirectTo?: string;
  hasError?: boolean;
}

export const Login = observer(function Login({
  redirectTo = '/dashboard',
  hasError = false,
}: LoginProps) {
  const sessionStore = useAppSessionStore();
  const session = sessionStore.snapshot;
  const router = useRouter();

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
          Sign in to KotobaHub
        </h1>

        <p className="mt-4 text-body text-muted-foreground">
          Use your Google account to save your learning profile and progress. If this is your first
          visit, you’ll choose your study preferences next.
        </p>
        <div className="mt-8 space-y-6">
          {!session ? (
            sessionStore.error ? (
              <ErrorStatePanel
                title="Your session could not be loaded"
                description={sessionStore.error.message}
                action={
                  <Button
                    onClick={() => void sessionStore.load()}
                    disabled={sessionStore.isLoading}>
                    Try again
                  </Button>
                }
              />
            ) : (
              <LoadingPanel label="Checking your session…" />
            )
          ) : session.isAuthenticated ? (
            <LoadingPanel label="Opening your study space…" />
          ) : (
            <>
              {hasError && (
                <ErrorStatePanel
                  title="Sign-in was not completed"
                  description="Try signing in with Google again."
                />
              )}

              <form
                method="post"
                action={`/api/v1/auth/google/start?${new URLSearchParams({ redirectTo }).toString()}`}>
                <Button type="submit" className="w-full">
                  Continue with Google
                </Button>
              </form>

              <p className="text-body-sm text-muted-foreground">
                You’ll continue to Google to choose an account, then return here.
              </p>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
});
