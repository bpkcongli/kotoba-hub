'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { FlashcardContainerProvider } from './FlashcardContainerProvider';

export function FlashcardRouteScope({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname !== '/flashcards' && !pathname.startsWith('/flashcards/')) return children;

  return <FlashcardContainerProvider>{children}</FlashcardContainerProvider>;
}
