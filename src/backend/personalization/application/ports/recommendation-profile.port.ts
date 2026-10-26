export interface RecommendationProfileSnapshot {
  appAccess: 'ONBOARDING_REQUIRED' | 'APP_READY';
  learnerProfile: {
    currentLevel: string | null;
    targetLevel: string;
    weakSkillFocuses: string[];
    knownSkillClaims: string[];
  } | null;
}

export interface RecommendationProfilePort {
  getProfile(userId: string): Promise<RecommendationProfileSnapshot | null>;
}
