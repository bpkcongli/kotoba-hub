'use client';

import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { useAppSessionStore } from '@/frontend/shared/hooks';
import { AppBottomNav } from './AppBottomNav';
import { AppHeader } from './AppHeader';
import { AppShell } from './AppShell';
import { AppSidebar } from './AppSidebar';
import { APP_NAVIGATION, isNavigationActive } from './navigation';

export const AppWorkspace = observer(function AppWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const store = useAppSessionStore();
  const session = store.snapshot;

  const title =
    APP_NAVIGATION.find((item) => isNavigationActive(pathname, item.href))?.label ??
    'Your study space';

  useEffect(() => {
    if (!session) return;

    if (!session.isAuthenticated) {
      router.replace('/login');
      router.refresh();
    } else if (session.authorization.appAccess === 'ONBOARDING_REQUIRED') {
      router.replace('/onboarding');
      router.refresh();
    }
  }, [router, session]);

  if (!session || session.authorization.appAccess !== 'APP_READY') {
    return (
      <AppShell variant="public" header={<AppHeader title="Your study space" />}>
        {store.error ? (
          <ErrorStatePanel
            title="Your session could not be loaded"
            description={store.error.message}
            action={
              <Button onClick={() => void store.load()} disabled={store.isLoading}>
                Try again
              </Button>
            }
          />
        ) : (
          <LoadingPanel />
        )}
      </AppShell>
    );
  }

  if (pathname.startsWith('/flashcards/sessions/')) return children;

  const accountMenu = (
    <details className="group relative">
      <summary className="flex min-h-11 max-w-48 cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-body-sm hover:bg-secondary focus-visible:focus-ring [&::-webkit-details-marker]:hidden">
        <UserRound aria-hidden="true" className="size-5 shrink-0" />
        <span className="truncate">{session.user?.displayName ?? 'Account'}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-fast group-open:rotate-180"
        />
      </summary>

      <div className="absolute right-0 z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] space-y-3 rounded-md border bg-card p-4 shadow-md">
        <p className="text-body-sm font-semibold wrap-break-word">
          {session.user?.displayName ?? 'Your account'}
        </p>
        <p className="text-caption break-all text-muted-foreground">{session.user?.email}</p>

        <p
          aria-disabled="true"
          className="border-t border-border-subtle pt-3 text-body-sm text-muted-foreground">
          Settings <span className="block text-caption">Not available yet</span>
        </p>

        <Button
          variant="secondary"
          className="w-full"
          disabled={store.isSigningOut}
          onClick={() => void store.signOut()}>
          <LogOut aria-hidden="true" />
          {store.isSigningOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </details>
  );

  return (
    <AppShell
      variant="app"
      header={<AppHeader title={title} accountMenu={accountMenu} />}
      sidebar={<AppSidebar pathname={pathname} />}
      bottomNav={<AppBottomNav pathname={pathname} />}>
      <div className="space-y-6">
        {store.error && (
          <ErrorStatePanel
            title="Your session could not be updated"
            description={store.error.message}
          />
        )}

        {children}
      </div>
    </AppShell>
  );
});
