'use client';

import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';
import { AppBottomNav } from './AppBottomNav';
import { AppHeader } from './AppHeader';
import { AppShell } from './AppShell';
import { AppSidebar } from './AppSidebar';
import { APP_NAVIGATION, isNavigationActive } from './navigation';

export const AppWorkspace = observer(function AppWorkspace({ children }: { children: ReactNode }) {
  const t = useUiTranslations();

  const pathname = usePathname();
  const router = useRouter();

  const store = useAppSessionStore();
  const session = store.snapshot;

  const currentNavigation = APP_NAVIGATION.find((item) => isNavigationActive(pathname, item.href));
  const title = currentNavigation?.messageKey
    ? t(currentNavigation.messageKey)
    : t('SHARED:APP_WORKSPACE.PAGE.TITLE');

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
      <AppShell
        variant="public"
        header={<AppHeader title={t('SHARED:APP_WORKSPACE.PAGE.TITLE')} />}>
        {store.error ? (
          <ErrorStatePanel
            title={t('AUTH:LOGIN_SCREEN.SESSION_ERROR.TITLE')}
            description={errorMessage(store.error, t)}
            action={
              <Button onClick={() => void store.load()} disabled={store.isLoading}>
                {t('SHARED:RECOVERY_ACTIONS.RETRY_BUTTON.LABEL')}
              </Button>
            }
          />
        ) : (
          <LoadingPanel />
        )}
      </AppShell>
    );
  }

  if (
    pathname.startsWith('/flashcards/sessions/') ||
    pathname.startsWith('/practice/sessions/') ||
    /^\/syllabus\/lessons\/[^/]+\/post-study\/?$/.test(pathname)
  )
    return children;

  const accountMenu = (
    <details className="group relative">
      <summary className="flex min-h-11 max-w-48 cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-body-sm hover:bg-secondary focus-visible:focus-ring [&::-webkit-details-marker]:hidden">
        <UserRound aria-hidden="true" className="size-5 shrink-0" />
        <span className="truncate">
          {session.user?.displayName ?? t('SHARED:APP_WORKSPACE.ACCOUNT_MENU.LABEL')}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-fast group-open:rotate-180"
        />
      </summary>

      <div className="absolute right-0 z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] space-y-3 rounded-md border bg-card p-4 shadow-md">
        <p className="text-body-sm font-semibold wrap-break-word">
          {session.user?.displayName ?? t('SHARED:APP_WORKSPACE.ACCOUNT_MENU.ARIA_LABEL')}
        </p>
        <p className="text-caption break-all text-muted-foreground">{session.user?.email}</p>

        <p
          aria-disabled="true"
          className="border-t border-border-subtle pt-3 text-body-sm text-muted-foreground">
          {t('SHARED:APP_NAVIGATION.SETTINGS_LINK.LABEL')}{' '}
          <span className="block text-caption">
            {t('SHARED:APP_NAVIGATION.UNAVAILABLE_LINK.STATUS_LABEL')}
          </span>
        </p>

        <Button
          variant="secondary"
          className="w-full"
          disabled={store.isSigningOut}
          onClick={() => void store.signOut()}>
          <LogOut aria-hidden="true" />
          {store.isSigningOut
            ? t('SHARED:APP_WORKSPACE.SIGN_OUT_BUTTON.LOADING_LABEL')
            : t('SHARED:APP_WORKSPACE.SIGN_OUT_BUTTON.LABEL')}
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
            title={t('AUTH:ONBOARDING_WORKSPACE.SESSION_ERROR.TITLE')}
            description={errorMessage(store.error, t)}
          />
        )}

        {children}
      </div>
    </AppShell>
  );
});
