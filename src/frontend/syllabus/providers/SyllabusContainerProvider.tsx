'use client';

import type { ReactNode } from 'react';
import { FeatureContainerProvider } from '@/frontend/shared/providers';
import { createSyllabusContainer } from '@/frontend/syllabus/services';

export function SyllabusContainerProvider({
  children,
  scopeKey = 'syllabus',
}: {
  children: ReactNode;
  scopeKey?: string;
}) {
  return (
    <FeatureContainerProvider scopeKey={scopeKey} createContainer={createSyllabusContainer}>
      {children}
    </FeatureContainerProvider>
  );
}
