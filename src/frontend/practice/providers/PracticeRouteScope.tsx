'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PracticeContainerProvider } from './PracticeContainerProvider';

export function PracticeRouteScope({ children }: { children: ReactNode }) {
  const path = usePathname();

  if (path !== '/practice' && !path.startsWith('/practice/')) return children;

  return <PracticeContainerProvider>{children}</PracticeContainerProvider>;
}
