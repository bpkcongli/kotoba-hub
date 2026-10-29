export interface AssessmentProfile {
  currentLevel: string | null;
  targetLevel: string;
  dailyGoalMinutes: number;
  preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
  weakSkillFocuses: string[];
}

export interface SyllabusTrack {
  id: string;
  slug: string;
  curriculumLevel: string;
  title: string;
  description: string | null;
  sortOrder: number;
  unitCount: number;
  foundationUnitSlug: string | null;
}

export interface Recommendation {
  recommendedTrackSlug: string;
  recommendedUnitSlug: string;
  nextLessonSlug: string;
}

export interface AssessmentDraft {
  draftProfile: AssessmentProfile;
  suggestedKnownSkillClaims: {
    skillCode: string;
    title: string;
    source: 'ai_note' | 'structured_input';
    confidence: number;
  }[];
  recommendation: Recommendation;
  aiNormalizationUsed: boolean;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  appAccess: 'ONBOARDING_REQUIRED' | 'APP_READY';
  learnerProfile:
    | (AssessmentProfile & {
        knownSkillClaims: string[];
        onboardingCompletedAt: string | null;
      })
    | null;
}

export interface OnboardingResult {
  userProfile: UserProfile;
  recommendation: Recommendation;
}
