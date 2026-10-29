'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useAppSessionStore } from '@/frontend/shared/hooks';
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
  const store = useAppSessionStore();

  const [bootstrapState] = useState(createBootstrapState);
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
        Loading your workspace…
      </div>
    );
  }

  return children;
}
