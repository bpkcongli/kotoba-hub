'use client';

import { useContext } from 'react';
import { FrontendContainerContext } from '@/frontend/shared/providers/frontend-container-context';

export function useFrontendContainer() {
  const container = useContext(FrontendContainerContext);
  if (!container) throw new Error('Frontend hooks require FrontendContainerProvider.');

  return container;
}
