import { z } from 'zod';
import { localeSchema } from '@/shared/locale';

export const preferencesPatchSchema = z
  .strictObject({
    contentLocale: localeSchema.optional(),
    uiLocale: localeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one preference.');
