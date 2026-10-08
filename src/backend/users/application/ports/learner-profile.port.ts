import type { LearnerProfileInput } from '@/backend/users/domain/repositories/learner-profile.repository';

export interface UserProfileSnapshot {
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

export interface LearnerProfilePort {
  get(userId: string): Promise<UserProfileSnapshot | null>;

  confirm(input: LearnerProfileInput): Promise<UserProfileSnapshot>;
}
