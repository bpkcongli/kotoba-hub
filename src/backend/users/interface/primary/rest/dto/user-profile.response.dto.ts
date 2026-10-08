import type { UserProfileSnapshot } from '@/backend/users/application/ports/learner-profile.port';

export interface UserProfileResponseDto {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  appAccess: 'ONBOARDING_REQUIRED' | 'APP_READY';
  learnerProfile: {
    currentLevel: string | null;
    targetLevel: string;
    dailyGoalMinutes: number;
    preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
    weakSkillFocuses: string[];
    knownSkillClaims: string[];
    onboardingCompletedAt: string | null;
  } | null;
}

export function toUserProfileResponseDto(profile: UserProfileSnapshot): UserProfileResponseDto {
  return {
    userId: profile.userId,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    onboardingCompleted: profile.onboardingCompleted,
    appAccess: profile.appAccess,
    learnerProfile: profile.learnerProfile
      ? {
          currentLevel: profile.learnerProfile.currentLevel,
          targetLevel: profile.learnerProfile.targetLevel,
          dailyGoalMinutes: profile.learnerProfile.dailyGoalMinutes,
          preferredScript: profile.learnerProfile.preferredScript,
          weakSkillFocuses: [...profile.learnerProfile.weakSkillFocuses],
          knownSkillClaims: [...profile.learnerProfile.knownSkillClaims],
          onboardingCompletedAt: profile.learnerProfile.onboardingCompletedAt,
        }
      : null,
  };
}
