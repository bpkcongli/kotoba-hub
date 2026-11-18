'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/frontend/shared/components/atoms/button';
import { uiTranslator } from '@/shared/i18n';
import type { Locale } from '@/shared/locale';

const mockingEnabled =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_API_MOCKING === 'true';

export function MockProvider({
  children,
  locale = 'en',
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  const t = uiTranslator(locale);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    mockingEnabled ? 'loading' : 'ready',
  );

  useEffect(() => {
    if (!mockingEnabled) return;

    let active = true;

    import('@/mocks/main')
      .then(({ startMocking }) => startMocking())
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch((error: unknown) => {
        console.error('Could not start the development mock API.', error);

        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="grid min-h-svh place-items-center p-6" role="status">
        {t('SHARED:MOCK_STARTUP.WORKSPACE.LOADING_LABEL')}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <div className="max-w-md space-y-4" role="alert">
          <h1 className="text-h3 font-semibold">{t('SHARED:MOCK_STARTUP.STARTUP_ERROR.TITLE')}</h1>

          <p className="text-muted-foreground">
            {t('SHARED:MOCK_STARTUP.STARTUP_ERROR.DESCRIPTION')}
          </p>

          <Button onClick={() => window.location.reload()}>
            {t('SHARED:MOCK_STARTUP.RELOAD_BUTTON.LABEL')}
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
