'use client';

import { PROGRESS_TYPES } from '@/frontend/progress/services';
import type { IProgressStore } from '@/frontend/progress/services/internal';
import { useFrontendContainer } from '@/frontend/shared/hooks';

export function useProgressStore() {
  return useFrontendContainer().get<IProgressStore>(PROGRESS_TYPES.Store);
}
