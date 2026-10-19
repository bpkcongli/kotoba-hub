import { z } from 'zod';
import { paginationRequestSchema } from '@/backend/shared/interface/primary/rest/dto/pagination.request.dto';

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listTracksRequestSchema = paginationRequestSchema.extend({
  curriculumLevels: z
    .string()
    .regex(/^N[2-5](,N[2-5])*$/)
    .optional(),
});

export const getUnitRequestSchema = z.object({
  unitSlug: slug,
  includeLessons: booleanQuery.default(true),
  includeSkills: booleanQuery.default(true),
});

export const getLessonRequestSchema = z.object({
  lessonSlug: slug,
  includeContentBlocks: booleanQuery.default(true),
  includeSkills: booleanQuery.default(true),
});
