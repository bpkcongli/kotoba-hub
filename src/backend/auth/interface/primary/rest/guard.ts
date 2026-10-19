import type { AccessRequirement } from '@/backend/auth/application/services/authorization.service';
import type { SessionSnapshot } from '@/backend/auth/application/services/session.service';
import { authorizationService, getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

export async function requireApiAccess(
  request: Request,
  requirement: AccessRequirement,
): Promise<{ session: SessionSnapshot; response: null } | { session: null; response: Response }> {
  const session = await getSessionSnapshot(request.headers.get('cookie'));
  const denial = authorizationService.authorize(session, requirement);

  if (denial === 'UNAUTHENTICATED') {
    return { session: null, response: apiResponse(ApplicationStatusCode.AUTH_REQUIRED) };
  }

  if (denial === 'ONBOARDING_REQUIRED') {
    return {
      session: null,
      response: apiResponse(ApplicationStatusCode.ONBOARDING_REQUIRED),
    };
  }

  return { session, response: null };
}
