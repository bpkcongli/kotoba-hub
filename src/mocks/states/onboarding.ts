import type { UserProfile } from '@/frontend/onboarding/interfaces/entities';
import { registerMockStateReset } from './reset';

let profile: UserProfile | null = null;

export function getMockOnboardingProfile(): UserProfile | null {
  return profile ? structuredClone(profile) : null;
}

export function setMockOnboardingProfile(next: UserProfile): void {
  profile = structuredClone(next);
}

export function resetMockOnboarding(): void {
  profile = null;
}

registerMockStateReset(resetMockOnboarding);
