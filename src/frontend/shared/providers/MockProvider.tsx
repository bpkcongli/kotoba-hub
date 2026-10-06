'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/frontend/shared/components/atoms/button';

const mockingEnabled =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_API_MOCKING === 'true';

export function MockProvider({ children }: { children: ReactNode }) {
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
        Preparing the development API…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <div className="max-w-md space-y-4" role="alert">
          <h1 className="text-h3 font-semibold">The development API could not start</h1>
          <p className="text-muted-foreground">
            Check the browser console for details, then reload to try again.
          </p>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      </div>
    );
  }

  return children;
}
