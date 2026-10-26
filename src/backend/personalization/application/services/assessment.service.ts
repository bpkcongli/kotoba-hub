import type { OnboardingRecommendation } from './confirm-assessment.service';

export interface AssessmentInput {
  userId: string;
  requestId: string;
  currentLevel: string | null;
  targetLevel: string;
  dailyGoalMinutes: number;
  preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
  weakSkillFocuses: string[];
  note?: string | null;
}

export interface AssessmentResult {
  draftProfile: {
    currentLevel: string | null;
    targetLevel: string;
    dailyGoalMinutes: number;
    preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
    weakSkillFocuses: string[];
  };
  suggestedKnownSkillClaims: {
    skillCode: string;
    title: string;
    source: 'ai_note';
    confidence: number;
  }[];
  recommendation: OnboardingRecommendation;
  aiNormalizationUsed: boolean;
}

export interface AssessmentService {
  assess(input: AssessmentInput): Promise<AssessmentResult>;
}
