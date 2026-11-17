'use client';

import { reaction } from 'mobx';
import { useEffect, useState, type ReactNode } from 'react';
import type { FrontendBootstrapData, FrontendContainerOptions } from '@/frontend/shared/interfaces';
import { createFrontendContainer, SHARED_TYPES } from '@/frontend/shared/services';
import type { IAppSessionStore, ILocaleStore } from '@/frontend/shared/services/internal';
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

    const locale = container.get<ILocaleStore>(SHARED_TYPES.LocaleStore);
    const stop = reaction(
      () => session.sessionIdentity,
      () => locale.reset(),
    );

    return () => {
      stop();
      session.dispose();
      locale.dispose();
    };
  }, [container]);

  useEffect(() => {
    if (bootstrap?.session)
      container.get<IAppSessionStore>(SHARED_TYPES.AppSessionStore).hydrate(bootstrap.session);

    if (bootstrap?.preferences)
      container
        .get<ILocaleStore>(SHARED_TYPES.LocaleStore)
        .hydrate(bootstrap.preferences, bootstrap.localizedSyllabus ?? false);
  }, [container, bootstrap?.session, bootstrap?.preferences, bootstrap?.localizedSyllabus]);

  return (
    <FrontendContainerContext.Provider value={container}>
      {children}
    </FrontendContainerContext.Provider>
  );
}
