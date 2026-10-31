import type { z } from 'zod';
import type {
  progressOverviewSchema,
  progressSessionSchema,
  progressEventSchema,
  paginationSchema,
} from '@/frontend/progress/interfaces/responses';

export type ProgressOverview = z.infer<typeof progressOverviewSchema>;

export type ProgressSession = z.infer<typeof progressSessionSchema>;

export type ProgressEvent = z.infer<typeof progressEventSchema>;

export type ProgressPagination = z.infer<typeof paginationSchema>;

export type ProgressSourceType = ProgressEvent['sourceType'];

export interface LessonProgress {
  lessonSlug: string;
  title: string;
  currentUnderstandingLevel: number;
  targetDifficultyLevel: number;
  isReview: boolean;
}
