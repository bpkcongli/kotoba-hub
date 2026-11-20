'use client';

import type { ReactNode } from 'react';
import { cn } from '@/frontend/shared/helpers/cn';
import { useUiTranslations } from '@/frontend/shared/hooks';

export type AppShellProps = {
  children: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  contentWidth?: 'app' | 'reading' | 'session';
} & (
  | { variant: 'public' | 'onboarding' | 'focus' }
  | { variant: 'app'; sidebar: ReactNode; bottomNav: ReactNode }
);

export function AppShell(props: AppShellProps) {
  const t = useUiTranslations();

  const { children, header, footer, variant, contentWidth } = props;

  return (
    <div
      className={cn(
        'min-h-svh',
        variant === 'app' && 'lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]',
      )}>
      <a
        href="#main-content"
        className="sr-only fixed top-4 left-4 z-50 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground focus:not-sr-only focus-visible:focus-ring">
        {t('SHARED:APP_NAVIGATION.SKIP_TO_CONTENT_LINK.LABEL')}
      </a>

      {variant === 'app' && props.sidebar}

      <div className="flex min-h-svh min-w-0 flex-col">
        {header}

        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'w-full min-w-0 flex-1 px-4 py-8 outline-none md:px-6 lg:px-8',
            variant === 'public'
              ? 'mx-auto max-w-public'
              : variant === 'onboarding'
                ? 'mx-auto max-w-180'
                : variant === 'focus' || contentWidth === 'session'
                  ? 'mx-auto max-w-180'
                  : contentWidth === 'reading'
                    ? 'mx-auto max-w-reading'
                    : undefined,
            variant === 'app' && 'pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-8',
          )}>
          {children}
        </main>

        {footer}

        {variant === 'app' && props.bottomNav}
      </div>
    </div>
  );
}
