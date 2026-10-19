import { z } from 'zod';
import { paginationRequestSchema } from '@/backend/shared/interface/primary/rest/dto/pagination.request.dto';

const trackSlug = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .optional();
const sourceTypes = z
  .string()
  .regex(/^(FLASHCARD|PRACTICE|LESSON_POST_STUDY)(,(FLASHCARD|PRACTICE|LESSON_POST_STUDY))*$/)
  .transform((value) => [...new Set(value.split(','))] as ProgressSourceType[])
  .optional();

type ProgressSourceType = 'FLASHCARD' | 'PRACTICE' | 'LESSON_POST_STUDY';

export const progressOverviewRequestSchema = z.object({ trackSlug });

export const progressSessionsRequestSchema = paginationRequestSchema.extend({
  sourceTypes,
  trackSlug,
});

export const progressTimelineRequestSchema = progressSessionsRequestSchema.extend({
  skillCodes: z
    .string()
    .max(5000)
    .regex(/^[a-z0-9_]+(,[a-z0-9_]+)*$/)
    .transform((value) => [...new Set(value.split(','))])
    .optional(),
});

export type ProgressOverviewRequestDto = z.infer<typeof progressOverviewRequestSchema>;
export type ProgressSessionsRequestDto = z.infer<typeof progressSessionsRequestSchema>;
export type ProgressTimelineRequestDto = z.infer<typeof progressTimelineRequestSchema>;
