import type { AuthorizationService } from '@/backend/auth/application/services/authorization.service';
import { authorizationService, getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { requireSameOrigin } from '@/backend/auth/interface/primary/rest/origin';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';
import type { UserPreferencesService } from '@/backend/users/application/services/user-preferences.service';
import { userPreferencesService } from '@/backend/users/infrastructure/di';
import { preferencesPatchRequestSchema } from './dto/user-preferences.request.dto';
import { toUserPreferencesDto } from './dto/user-preferences.response.dto';

export class UserPreferencesController {
  constructor(
    private readonly preferences: UserPreferencesService,
    private readonly authorization: AuthorizationService,
  ) {}

  async handle(request: Request): Promise<Response> {
    if (request.method === 'PATCH') {
      const denied = requireSameOrigin(request);
      if (denied) return apiResponse(ApplicationStatusCode.USER_PROFILE_ORIGIN_NOT_ALLOWED);
    }

    try {
      const session = await getSessionSnapshot(request.headers.get('cookie'));
      if (this.authorization.authorize(session, 'AUTHENTICATED') || !session.user)
        return apiResponse(ApplicationStatusCode.USER_PROFILE_UNAUTHORIZED);

      let data;

      if (request.method === 'PATCH') {
        const body = await request.json().catch(() => null);
        const parsed = preferencesPatchRequestSchema.safeParse(body);
        if (!parsed.success)
          return apiResponse(
            ApplicationStatusCode.USER_PROFILE_VALIDATION_ERROR,
            undefined,
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );

        data = await this.preferences.patch(session.user.id, parsed.data);
      } else data = await this.preferences.get(session.user.id);

      return apiResponse(ApplicationStatusCode.USER_PROFILE_SUCCESS, toUserPreferencesDto(data));
    } catch {
      return apiResponse(ApplicationStatusCode.UNHANDLED_USER_PROFILE_EXCEPTION);
    }
  }
}

export const userPreferencesController = new UserPreferencesController(
  userPreferencesService,
  authorizationService,
);
