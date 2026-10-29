'use client';

import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { AppShell, PublicHeader } from '@/frontend/shared/components/layouts';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { useAppSessionStore } from '@/frontend/shared/hooks';

export const OnboardingWorkspace = observer(function OnboardingWorkspace({
  children,
}: {
  children: ReactNode;
}) {
  const store = useAppSessionStore();
  const session = store.snapshot;
  const router = useRouter();

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
                {store.isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            )
          }
        />
      }>
      {store.error && (
        <div className="mb-6">
          <ErrorStatePanel
            title="Your session could not be updated"
            description={store.error.message}
            action={
              <Button
                variant="secondary"
                onClick={() => void store.load()}
                disabled={store.isLoading}>
                Check session
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
        <LoadingPanel label={store.isSigningOut ? 'Signing out…' : 'Opening your study space…'} />
      )}
    </AppShell>
  );
});
