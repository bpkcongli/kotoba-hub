'use client';

import type { Container } from 'inversify';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAppSessionStore, useFrontendContainer } from '@/frontend/shared/hooks';
import type { FeatureContainerOptions } from '@/frontend/shared/interfaces';
import { createFeatureContainer } from '@/frontend/shared/services';
import { FrontendContainerContext } from './frontend-container-context';

type ContainerFactory = (options: FeatureContainerOptions) => Container;

interface FeatureContainerProviderProps {
  children: ReactNode;
  scopeKey: string;
  createContainer?: ContainerFactory;
}

function FeatureScope({
  children,
  parentContainer,
  createContainer,
}: {
  children: ReactNode;
  parentContainer: Container;
  createContainer: ContainerFactory;
}) {
  const [container] = useState(() => createContainer({ parentContainer }));
  const lifecycle = useRef(0);

  useEffect(() => {
    lifecycle.current += 1;

    return () => {
      const disposedLifecycle = lifecycle.current;

      // Strict Mode immediately sets the same scope up again; its bindings must survive.
      queueMicrotask(() => {
        if (lifecycle.current === disposedLifecycle) {
          void container.unbindAllAsync().catch((error: unknown) => {
            console.error('Could not dispose the feature container.', error);
          });
        }
      });
    };
  }, [container]);

  return (
    <FrontendContainerContext.Provider value={container}>
      {children}
    </FrontendContainerContext.Provider>
  );
}

export const FeatureContainerProvider = observer(function FeatureContainerProvider({
  children,
  scopeKey,
  createContainer = createFeatureContainer,
}: FeatureContainerProviderProps) {
  const parentContainer = useFrontendContainer();
  const session = useAppSessionStore();

  return (
    <FeatureScope
      key={`${session.sessionIdentity}:${scopeKey}`}
      parentContainer={parentContainer}
      createContainer={createContainer}>
      {children}
    </FeatureScope>
  );
});
