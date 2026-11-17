import { z } from 'zod';
import { localeSchema } from '@/shared/locale';

export const localizationSchema = z.object({
  requestedLocale: localeSchema,
  resolvedLocale: localeSchema,
  isFallback: z.boolean(),
  contentRevision: z.number().int().positive(),
  translationRevision: z.number().int().positive(),
});
