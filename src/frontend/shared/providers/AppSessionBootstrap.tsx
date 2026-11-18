'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';
import type { AppSession } from '@/frontend/shared/interfaces/entities';

function createBootstrapState() {
  let applied: AppSession | null = null;
  const listeners = new Set<() => void>();

  return {
    read: () => applied,
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    apply(session: AppSession) {
      applied = session;

      for (const listener of listeners) listener();
    },
  };
}

export function AppSessionBootstrap({
  session,
  children,
}: {
  session: AppSession;
  children: ReactNode;
}) {
  const t = useUiTranslations();

  const [bootstrapState] = useState(createBootstrapState);
  const store = useAppSessionStore();

  const appliedSession = useSyncExternalStore(
    bootstrapState.subscribe,
    bootstrapState.read,
    () => null,
  );

  useEffect(() => {
    store.hydrate(session);
    bootstrapState.apply(session);
  }, [session, store, bootstrapState]);

  if (appliedSession !== session) {
    return (
      <div className="grid min-h-svh place-items-center p-6" role="status">
        {t('SHARED:SESSION_BOOTSTRAP.WORKSPACE.LOADING_LABEL')}
      </div>
    );
  }

  return children;
}
