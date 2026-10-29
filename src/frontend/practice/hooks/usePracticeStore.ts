'use client';

import { PRACTICE_TYPES } from '@/frontend/practice/services';
import type { IPracticeStore } from '@/frontend/practice/services/internal';
import { useFrontendContainer } from '@/frontend/shared/hooks';

export function usePracticeStore() {
  return useFrontendContainer().get<IPracticeStore>(PRACTICE_TYPES.Store);
}
