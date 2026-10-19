import { z } from 'zod';

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

const pagination = {
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER))
    .default(0),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default(10),
};

export const progressOverviewRequestSchema = z.object({ trackSlug });

export const progressSessionsRequestSchema = z.object({
  ...pagination,
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

export function progressQueryValue(url: URL, name: string): string | undefined {
  const values = url.searchParams.getAll(name);
  return values.length > 1 ? '\u0000' : values[0];
}
