import { AuthUserService } from '@/backend/users/application/services/auth-user';
import { LearnerProfileService } from '@/backend/users/application/services/learner-profile';
import { authUserRepository } from '@/backend/users/interface/secondary/persistence/drizzle-auth-user.repository';
import { learnerProfileRepository } from '@/backend/users/interface/secondary/persistence/drizzle-learner-profile.repository';

export const authUserService = new AuthUserService(authUserRepository);

export const learnerProfileService = new LearnerProfileService(
  learnerProfileRepository,
  authUserRepository,
);
