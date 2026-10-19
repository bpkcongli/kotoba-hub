import type { SessionSnapshot } from '@/backend/auth/application/services/session.service';

export type AccessRequirement = 'AUTHENTICATED' | 'APP_READY';
export type AccessDenial = 'UNAUTHENTICATED' | 'ONBOARDING_REQUIRED' | null;

export interface AuthorizationService {
  authorize(snapshot: SessionSnapshot, requirement: AccessRequirement): AccessDenial;
}
