import { ConfirmAssessmentService } from '@/backend/personalization/application/services/confirm-assessment';
import { onboardingCatalog } from '@/backend/syllabus/interface/secondary/seed/onboarding-catalog';
import { learnerProfileService } from '@/backend/users/infrastructure/di';

export const confirmAssessmentService = new ConfirmAssessmentService(
  onboardingCatalog,
  learnerProfileService,
);
