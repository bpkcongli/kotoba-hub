'use client';

import { useEffect, type ReactNode } from 'react';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { createPracticeContainer } from '@/frontend/practice/services';
import { FeatureContainerProvider } from '@/frontend/shared/providers';

function Lifecycle({ children }: { children: ReactNode }) {
  const store = usePracticeStore();

  useEffect(() => () => store.dispose(), [store]);

  return children;
}

export function PracticeContainerProvider({
  children,
  scopeKey = 'practice',
}: {
  children: ReactNode;
  scopeKey?: string;
}) {
  return (
    <FeatureContainerProvider scopeKey={scopeKey} createContainer={createPracticeContainer}>
      <Lifecycle>{children}</Lifecycle>
    </FeatureContainerProvider>
  );
}
