'use client';

import { useFrontendContainer } from '@/frontend/shared/hooks';
import { SYLLABUS_TYPES } from '@/frontend/syllabus/services';
import type { ISyllabusStore } from '@/frontend/syllabus/services/internal';

export function useSyllabusStore() {
  return useFrontendContainer().get<ISyllabusStore>(SYLLABUS_TYPES.Store);
}
