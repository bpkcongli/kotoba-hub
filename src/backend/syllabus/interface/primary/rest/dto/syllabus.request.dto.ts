import { z } from 'zod';

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listTracksRequestSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
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

export function queryValue(url: URL, name: string): string | undefined {
  const values = url.searchParams.getAll(name);
  if (values.length > 1) return '\u0000';

  return values[0] ?? undefined;
}
