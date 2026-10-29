'use client';

import { ONBOARDING_TYPES } from '@/frontend/onboarding/services';
import type { IOnboardingStore } from '@/frontend/onboarding/services/internal';
import { useFrontendContainer } from '@/frontend/shared/hooks';

export function useOnboardingStore(): IOnboardingStore {
  return useFrontendContainer().get<IOnboardingStore>(ONBOARDING_TYPES.OnboardingStore);
}
