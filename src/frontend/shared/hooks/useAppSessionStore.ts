'use client';

import { SHARED_TYPES } from '@/frontend/shared/services';
import type { IAppSessionStore } from '@/frontend/shared/services/internal';
import { useFrontendContainer } from './useFrontendContainer';

export function useAppSessionStore(): IAppSessionStore {
  return useFrontendContainer().get<IAppSessionStore>(SHARED_TYPES.AppSessionStore);
}
