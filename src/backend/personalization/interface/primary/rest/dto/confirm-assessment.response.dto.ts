import type { OnboardingRecommendation } from '@/backend/personalization/application/services/confirm-assessment';
import type { UserProfileSnapshot } from '@/backend/users/application/ports/learner-profile.port';
import {
  toUserProfileResponseDto,
  type UserProfileResponseDto,
} from '@/backend/users/interface/primary/rest/dto/user-profile.response.dto';

export interface ConfirmAssessmentResponseDto {
  userProfile: UserProfileResponseDto;
  recommendation: OnboardingRecommendation;
}

export function toConfirmAssessmentResponseDto(input: {
  userProfile: UserProfileSnapshot;
  recommendation: OnboardingRecommendation;
}): ConfirmAssessmentResponseDto {
  return {
    userProfile: toUserProfileResponseDto(input.userProfile),
    recommendation: {
      recommendedTrackSlug: input.recommendation.recommendedTrackSlug,
      recommendedUnitSlug: input.recommendation.recommendedUnitSlug,
      nextLessonSlug: input.recommendation.nextLessonSlug,
    },
  };
}
