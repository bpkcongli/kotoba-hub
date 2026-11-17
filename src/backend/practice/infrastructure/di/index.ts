import { recommendationService } from '@/backend/personalization/infrastructure/di';
import { PracticeServiceImpl } from '@/backend/practice/application/services/impl/practice.service.impl';
import type { PracticeService } from '@/backend/practice/application/services/practice.service';
import { PracticeAiAdapter } from '@/backend/practice/interface/secondary/ai/practice-ai.adapter';
import { postStudyDeliveryRepository } from '@/backend/practice/interface/secondary/persistence/drizzle-post-study-delivery.repository';
import { practiceRepository } from '@/backend/practice/interface/secondary/persistence/drizzle-practice.repository';
import { PracticeRecommendationAdapter } from '@/backend/practice/interface/secondary/personalization/practice-recommendation.adapter';
import { PracticeProgressAdapter } from '@/backend/practice/interface/secondary/progress/practice-progress.adapter';
import { PracticeCatalogAdapter } from '@/backend/practice/interface/secondary/syllabus/practice-catalog.adapter';
import { ContentLocaleAdapter } from '@/backend/practice/interface/secondary/users/content-locale.adapter';
import { progressService } from '@/backend/progress/infrastructure/di';
import { getAiService } from '@/backend/shared/infrastructure/di';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';
import { userPreferencesService } from '@/backend/users/infrastructure/di';

const practiceAiAdapter = new PracticeAiAdapter(getAiService);
const practiceCatalogAdapter = new PracticeCatalogAdapter(syllabusCatalogService);
const practiceProgressAdapter = new PracticeProgressAdapter(progressService);
const practiceRecommendationAdapter = new PracticeRecommendationAdapter(recommendationService);

export const practiceService: PracticeService = new PracticeServiceImpl(
  practiceRepository,
  practiceCatalogAdapter,
  practiceProgressAdapter,
  practiceRecommendationAdapter,
  practiceAiAdapter,
  undefined,
  undefined,
  postStudyDeliveryRepository,
);

export const contentLocaleAdapter = new ContentLocaleAdapter(userPreferencesService);
