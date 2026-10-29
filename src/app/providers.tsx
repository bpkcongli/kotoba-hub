'use client';

import type { ReactNode } from 'react';
import { FrontendContainerProvider, MockProvider } from '@/frontend/shared/providers';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MockProvider>
      <FrontendContainerProvider>{children}</FrontendContainerProvider>
    </MockProvider>
  );
}
