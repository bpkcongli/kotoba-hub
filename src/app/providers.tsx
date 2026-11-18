'use client';

import type { ReactNode } from 'react';
import type { FrontendBootstrapData } from '@/frontend/shared/interfaces';
import { FrontendContainerProvider, MockProvider } from '@/frontend/shared/providers';

export function Providers({
  children,
  bootstrap,
}: {
  children: ReactNode;
  bootstrap?: FrontendBootstrapData;
}) {
  return (
    <MockProvider locale={bootstrap?.preferences?.uiLocale}>
      <FrontendContainerProvider bootstrap={bootstrap}>{children}</FrontendContainerProvider>
    </MockProvider>
  );
}
