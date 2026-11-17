'use client';

import { SHARED_TYPES } from '@/frontend/shared/services';
import type { ILocaleStore } from '@/frontend/shared/services/internal/ILocaleStore';
import { useFrontendContainer } from './useFrontendContainer';

export function useLocaleStore(): ILocaleStore {
  return useFrontendContainer().get<ILocaleStore>(SHARED_TYPES.LocaleStore);
}
