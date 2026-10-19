import type { ConfirmAssessmentService } from '@/backend/personalization/application/services/confirm-assessment.service';
import { ConfirmAssessmentServiceImpl } from '@/backend/personalization/application/services/impl/confirm-assessment.service.impl';
import { SyllabusCatalogAdapter } from '@/backend/personalization/interface/secondary/syllabus/syllabus-catalog.adapter';
import { LearnerProfileAdapter } from '@/backend/personalization/interface/secondary/users/learner-profile.adapter';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';
import { learnerProfileService } from '@/backend/users/infrastructure/di';

const syllabusCatalogAdapter = new SyllabusCatalogAdapter(syllabusCatalogService);
const learnerProfileAdapter = new LearnerProfileAdapter(learnerProfileService);

export const confirmAssessmentService: ConfirmAssessmentService = new ConfirmAssessmentServiceImpl(
  syllabusCatalogAdapter,
  learnerProfileAdapter,
);
