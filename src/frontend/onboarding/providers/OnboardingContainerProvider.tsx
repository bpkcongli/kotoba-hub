'use client';

import type { ReactNode } from 'react';
import { createOnboardingContainer } from '@/frontend/onboarding/services';
import { FeatureContainerProvider } from '@/frontend/shared/providers';

export function OnboardingContainerProvider({ children }: { children: ReactNode }) {
  return (
    <FeatureContainerProvider scopeKey="onboarding" createContainer={createOnboardingContainer}>
      {children}
    </FeatureContainerProvider>
  );
}
