import { AuthorizationService } from '@/backend/auth/application/services/guard';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';
import type { LearnerProfilePort } from '@/backend/users/application/ports/learner-profile.port';
import { learnerProfileService } from '@/backend/users/infrastructure/di';
import { toUserProfileResponseDto } from './dto/user-profile.response.dto';

export class UserProfileController {
  private readonly authorization = new AuthorizationService();

  constructor(private readonly profiles: LearnerProfilePort) {}

  async getUserProfile(request: Request): Promise<Response> {
    try {
      const session = await getSessionSnapshot(request.headers.get('cookie'));
      if (this.authorization.authorize(session, 'AUTHENTICATED') || !session.user) {
        return apiResponse(ApplicationStatusCode.USER_PROFILE_UNAUTHORIZED);
      }

      const profile = await this.profiles.get(session.user.id);
      if (!profile) return apiResponse(ApplicationStatusCode.USER_PROFILE_UNAUTHORIZED);

      return apiResponse(
        ApplicationStatusCode.USER_PROFILE_SUCCESS,
        toUserProfileResponseDto(profile),
      );
    } catch {
      return apiResponse(ApplicationStatusCode.UNHANDLED_USER_PROFILE_EXCEPTION);
    }
  }
}

export const userProfileController = new UserProfileController(learnerProfileService);
