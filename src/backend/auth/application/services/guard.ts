import type { SessionSnapshot } from './session';

export type AccessRequirement = 'AUTHENTICATED' | 'APP_READY';

export class AuthorizationService {
  authorize(
    snapshot: SessionSnapshot,
    requirement: AccessRequirement,
  ): 'UNAUTHENTICATED' | 'ONBOARDING_REQUIRED' | null {
    if (!snapshot.isAuthenticated) return 'UNAUTHENTICATED';
    if (requirement === 'APP_READY' && snapshot.authorization.appAccess !== 'APP_READY') {
      return 'ONBOARDING_REQUIRED';
    }

    return null;
  }
}
