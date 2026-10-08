import type {
  LearnerProfilePort,
  UserProfileSnapshot,
} from '@/backend/users/application/ports/learner-profile.port';
import type { AuthUser } from '@/backend/users/domain/entities/auth-user';
import type { LearnerProfile } from '@/backend/users/domain/entities/learner-profile';
import type { AuthUserRepository } from '@/backend/users/domain/repositories/auth-user.repository';
import type {
  LearnerProfileInput,
  LearnerProfileRepository,
} from '@/backend/users/domain/repositories/learner-profile.repository';

function snapshot(user: AuthUser, profile: LearnerProfile | null): UserProfileSnapshot {
  const complete = profile?.onboardingCompleted === true;

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    onboardingCompleted: complete,
    appAccess: complete ? 'APP_READY' : 'ONBOARDING_REQUIRED',
    learnerProfile: profile
      ? {
          currentLevel: profile.currentLevel,
          targetLevel: profile.targetLevel,
          dailyGoalMinutes: profile.dailyGoalMinutes,
          preferredScript: profile.preferredScript,
          weakSkillFocuses: profile.weakSkillFocuses,
          knownSkillClaims: profile.knownSkillClaims,
          onboardingCompletedAt: profile.onboardingCompletedAt?.toISOString() ?? null,
        }
      : null,
  };
}

export class LearnerProfileService implements LearnerProfilePort {
  constructor(
    private readonly profileRepository: LearnerProfileRepository,
    private readonly userRepository: AuthUserRepository,
  ) {}

  async get(userId: string): Promise<UserProfileSnapshot | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    const profile = await this.profileRepository.findProfile(userId);

    return snapshot(user, profile);
  }

  async confirm(input: LearnerProfileInput): Promise<UserProfileSnapshot> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new Error('Authenticated user no longer exists.');

    const profile = await this.profileRepository.confirm(input);

    return snapshot(user, profile);
  }
}
