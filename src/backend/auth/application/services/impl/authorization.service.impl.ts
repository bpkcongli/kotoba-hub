import type {
  AuthorizationService,
  AccessRequirement,
  AccessDenial,
} from '@/backend/auth/application/services/authorization.service';
import type { SessionSnapshot } from '@/backend/auth/application/services/session.service';

export class AuthorizationServiceImpl implements AuthorizationService {
  authorize(snapshot: SessionSnapshot, requirement: AccessRequirement): AccessDenial {
    if (!snapshot.isAuthenticated) return 'UNAUTHENTICATED';
    if (requirement === 'APP_READY' && snapshot.authorization.appAccess !== 'APP_READY') {
      return 'ONBOARDING_REQUIRED';
    }

    return null;
  }
}
