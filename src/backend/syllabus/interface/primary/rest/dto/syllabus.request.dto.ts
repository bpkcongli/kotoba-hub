import { z } from 'zod';
import { paginationRequestSchema } from '@/backend/shared/interface/primary/rest/dto/pagination.request.dto';
import { localeSchema } from '@/shared/locale';

export const representationFields = {
  contentFormat: z.literal('localized').optional(),
  contentLocale: localeSchema.optional(),
};

export function validRepresentation(value: { contentFormat?: string; contentLocale?: string }) {
  return !value.contentLocale || value.contentFormat === 'localized';
}

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);

const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listTracksRequestSchema = paginationRequestSchema
  .extend({
    ...representationFields,
    includeUnits: booleanQuery.default(false),
    curriculumLevels: z
      .string()
      .regex(/^N[2-5](,N[2-5])*$/)
      .optional(),
  })
  .refine(validRepresentation, {
    path: ['contentLocale'],
    message: 'contentLocale requires contentFormat=localized.',
  });

export const getUnitRequestSchema = z
  .object({
    ...representationFields,
    unitSlug: slug,
    includeLessons: booleanQuery.default(true),
    includeSkills: booleanQuery.default(true),
  })
  .refine(validRepresentation, {
    path: ['contentLocale'],
    message: 'contentLocale requires contentFormat=localized.',
  });

export const getLessonRequestSchema = z
  .object({
    ...representationFields,
    lessonSlug: slug,
    includeContentBlocks: booleanQuery.default(true),
    includeSkills: booleanQuery.default(true),
  })
  .refine(validRepresentation, {
    path: ['contentLocale'],
    message: 'contentLocale requires contentFormat=localized.',
  });
