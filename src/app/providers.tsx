'use client';

import type { ReactNode } from 'react';
import { MockProvider } from '@/frontend/shared/providers/MockProvider';

export function Providers({ children }: { children: ReactNode }) {
  return <MockProvider>{children}</MockProvider>;
}
