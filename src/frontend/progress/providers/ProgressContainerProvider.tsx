'use client';

import type { ReactNode } from 'react';
import { createProgressContainer } from '@/frontend/progress/services';
import { FeatureContainerProvider } from '@/frontend/shared/providers';

export function ProgressContainerProvider({
  children,
  scopeKey = 'progress',
}: {
  children: ReactNode;
  scopeKey?: string;
}) {
  return (
    <FeatureContainerProvider scopeKey={scopeKey} createContainer={createProgressContainer}>
      {children}
    </FeatureContainerProvider>
  );
}
