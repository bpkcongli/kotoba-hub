import type { AuthUserService } from '@/backend/users/application/services/auth-user.service';
import { AuthUserServiceImpl } from '@/backend/users/application/services/impl/auth-user.service.impl';
import { LearnerProfileServiceImpl } from '@/backend/users/application/services/impl/learner-profile.service.impl';
import type { LearnerProfileService } from '@/backend/users/application/services/learner-profile.service';
import { authUserRepository } from '@/backend/users/interface/secondary/persistence/drizzle-auth-user.repository';
import { learnerProfileRepository } from '@/backend/users/interface/secondary/persistence/drizzle-learner-profile.repository';

export const authUserService: AuthUserService = new AuthUserServiceImpl(authUserRepository);

export const learnerProfileService: LearnerProfileService = new LearnerProfileServiceImpl(
  learnerProfileRepository,
  authUserRepository,
);
