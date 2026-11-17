import { ClientException } from '@/frontend/shared/exceptions';
import { localizationSchema } from '@/frontend/shared/interfaces/responses/Localization';
import type { Locale } from '@/shared/locale';

export function validateLocalizedContent(value: unknown, requestedLocale?: Locale): void {
  if (!requestedLocale || !value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    value.forEach((item) => validateLocalizedContent(item, requestedLocale));
    return;
  }

  const row = value as Record<string, unknown>;
  if ('title' in row || 'blockType' in row || ('questionType' in row && 'promptPayload' in row)) {
    const metadata = localizationSchema.safeParse(row.localization);
    if (
      !metadata.success ||
      metadata.data.requestedLocale !== requestedLocale ||
      metadata.data.isFallback !== (metadata.data.resolvedLocale !== requestedLocale)
    ) {
      throw new ClientException(
        'contract',
        'The content language could not be confirmed. Please try again.',
      );
    }
  }

  for (const key of [
    'tracks',
    'track',
    'units',
    'unit',
    'lessons',
    'skills',
    'contentBlocks',
    'question',
  ]) {
    if (row[key]) validateLocalizedContent(row[key], requestedLocale);
  }
}
