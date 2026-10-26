import type { ConfirmAssessmentService } from '@/backend/personalization/application/services/confirm-assessment.service';
import { ConfirmAssessmentServiceImpl } from '@/backend/personalization/application/services/impl/confirm-assessment.service.impl';
import { RecommendationServiceImpl } from '@/backend/personalization/application/services/impl/recommendation.service.impl';
import type { RecommendationService } from '@/backend/personalization/application/services/recommendation.service';
import { RecommendationProgressAdapter } from '@/backend/personalization/interface/secondary/progress/recommendation-progress.adapter';
import { RecommendationCatalogAdapter } from '@/backend/personalization/interface/secondary/syllabus/recommendation-catalog.adapter';
import { SyllabusCatalogAdapter } from '@/backend/personalization/interface/secondary/syllabus/syllabus-catalog.adapter';
import { LearnerProfileAdapter } from '@/backend/personalization/interface/secondary/users/learner-profile.adapter';
import { learningContextService } from '@/backend/progress/infrastructure/di';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';
import { learnerProfileService } from '@/backend/users/infrastructure/di';

const syllabusCatalogAdapter = new SyllabusCatalogAdapter(syllabusCatalogService);
const learnerProfileAdapter = new LearnerProfileAdapter(learnerProfileService);
const recommendationCatalogAdapter = new RecommendationCatalogAdapter(syllabusCatalogService);
const recommendationProgressAdapter = new RecommendationProgressAdapter(learningContextService);

export const confirmAssessmentService: ConfirmAssessmentService = new ConfirmAssessmentServiceImpl(
  syllabusCatalogAdapter,
  learnerProfileAdapter,
);

export const recommendationService: RecommendationService = new RecommendationServiceImpl(
  learnerProfileAdapter,
  recommendationCatalogAdapter,
  recommendationProgressAdapter,
);
