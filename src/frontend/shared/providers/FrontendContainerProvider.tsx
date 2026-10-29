'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { FrontendBootstrapData, FrontendContainerOptions } from '@/frontend/shared/interfaces';
import { createFrontendContainer, SHARED_TYPES } from '@/frontend/shared/services';
import type { IAppSessionStore } from '@/frontend/shared/services/internal';
import { FrontendContainerContext } from './frontend-container-context';

export interface FrontendContainerProviderProps {
  children: ReactNode;
  options?: Partial<FrontendContainerOptions>;
  bootstrap?: FrontendBootstrapData;
}

export function FrontendContainerProvider({
  children,
  options,
  bootstrap,
}: FrontendContainerProviderProps) {
  const [container] = useState(() =>
    createFrontendContainer({
      ...options,
      bootstrap: bootstrap ?? options?.bootstrap,
    }),
  );

  useEffect(() => {
    const session = container.get<IAppSessionStore>(SHARED_TYPES.AppSessionStore);
    if (session.snapshot === null) void session.load();

    return () => session.dispose();
  }, [container]);

  return (
    <FrontendContainerContext.Provider value={container}>
      {children}
    </FrontendContainerContext.Provider>
  );
}
