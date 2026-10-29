'use client';

import { useEffect, type ReactNode } from 'react';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import { createFlashcardContainer } from '@/frontend/flashcards/services';
import { FeatureContainerProvider } from '@/frontend/shared/providers';

function Lifecycle({ children }: { children: ReactNode }) {
  const store = useFlashcardStore();

  useEffect(() => () => store.dispose(), [store]);

  return children;
}

export function FlashcardContainerProvider({ children }: { children: ReactNode }) {
  return (
    <FeatureContainerProvider scopeKey="flashcards" createContainer={createFlashcardContainer}>
      <Lifecycle>{children}</Lifecycle>
    </FeatureContainerProvider>
  );
}
