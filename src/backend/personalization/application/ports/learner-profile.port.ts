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

export interface ConfirmLearnerProfileInput {
  userId: string;
  currentLevel: string | null;
  targetLevel: string;
  dailyGoalMinutes: number;
  preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
  weakSkillFocuses: string[];
  knownSkillClaims: string[];
}

export interface LearnerProfilePort {
  confirm(input: ConfirmLearnerProfileInput): Promise<UserProfileSnapshot>;
}
