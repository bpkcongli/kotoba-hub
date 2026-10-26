import type { AssessmentResult } from '@/backend/personalization/application/services/assessment.service';
import type { OnboardingRecommendation } from '@/backend/personalization/application/services/confirm-assessment.service';

export interface AssessmentResponseDto {
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

export function toAssessmentResponseDto(input: AssessmentResult): AssessmentResponseDto {
  return {
    draftProfile: {
      currentLevel: input.draftProfile.currentLevel,
      targetLevel: input.draftProfile.targetLevel,
      dailyGoalMinutes: input.draftProfile.dailyGoalMinutes,
      preferredScript: input.draftProfile.preferredScript,
      weakSkillFocuses: [...input.draftProfile.weakSkillFocuses],
    },
    suggestedKnownSkillClaims: input.suggestedKnownSkillClaims.map((claim) => ({
      skillCode: claim.skillCode,
      title: claim.title,
      source: claim.source,
      confidence: claim.confidence,
    })),
    recommendation: {
      recommendedTrackSlug: input.recommendation.recommendedTrackSlug,
      recommendedUnitSlug: input.recommendation.recommendedUnitSlug,
      nextLessonSlug: input.recommendation.nextLessonSlug,
    },
    aiNormalizationUsed: input.aiNormalizationUsed,
  };
}
