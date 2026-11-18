'use client';

import { observer } from 'mobx-react-lite';
import { useEffect, type ReactNode } from 'react';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import { createFlashcardContainer } from '@/frontend/flashcards/services';
import { LoadingPanel } from '@/frontend/shared/components/organisms';
import { useLocaleStore, useUiTranslations } from '@/frontend/shared/hooks';
import { FeatureContainerProvider } from '@/frontend/shared/providers';

const Lifecycle = observer(function Lifecycle({ children }: { children: ReactNode }) {
  const t = useUiTranslations();

  const store = useFlashcardStore();
  const locale = useLocaleStore();

  useEffect(
    () => store.setContentLocale(locale.preferences.contentLocale),
    [store, locale.preferences.contentLocale],
  );

  useEffect(() => () => store.dispose(), [store]);

  return store.contentLocale ? (
    children
  ) : (
    <LoadingPanel label={t('FLASHCARDS:FLASHCARDS_HUB.WORKSPACE.LOADING_LABEL')} />
  );
});

export function FlashcardContainerProvider({ children }: { children: ReactNode }) {
  return (
    <FeatureContainerProvider scopeKey="flashcards" createContainer={createFlashcardContainer}>
      <Lifecycle>{children}</Lifecycle>
    </FeatureContainerProvider>
  );
}
