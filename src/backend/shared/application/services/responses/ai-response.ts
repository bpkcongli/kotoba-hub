import type { z } from 'zod';
import type {
  generatedPracticeSchema,
  gradedAnswerSchema,
  placementSchema,
  recommendationSchema,
} from '@/backend/shared/application/helpers/ai-schemas';

export type GeneratedPracticeSession = z.infer<typeof generatedPracticeSchema>;

export type GradedPracticeAnswer = z.infer<typeof gradedAnswerSchema>;

export type PlacementSummary = z.infer<typeof placementSchema>;

export type StudyRecommendation = z.infer<typeof recommendationSchema>;
