import type { UserProfileSnapshot } from '@/backend/users/application/ports/learner-profile.port';

export interface ConfirmAssessmentInput {
  userId: string;
  currentLevel: string | null;
  targetLevel: string;
  dailyGoalMinutes: number;
  preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
  weakSkillFocuses: string[];
  knownSkillClaims: string[];
}

export interface OnboardingRecommendation {
  recommendedTrackSlug: string;
  recommendedUnitSlug: string;
  nextLessonSlug: string;
}

export interface ConfirmAssessmentResult {
  userProfile: UserProfileSnapshot;
  recommendation: OnboardingRecommendation;
}

export interface ConfirmAssessmentService {
  confirm(input: ConfirmAssessmentInput): Promise<ConfirmAssessmentResult>;
}
