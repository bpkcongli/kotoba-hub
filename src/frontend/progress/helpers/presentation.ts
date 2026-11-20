import { createFormatter } from 'next-intl';
import type { ProgressSourceType } from '@/frontend/progress/interfaces/entities';
import { uiTranslator, type UiMessageKey } from '@/shared/i18n';
import type { Locale } from '@/shared/locale';

export const SOURCE_MESSAGE_KEYS: Record<ProgressSourceType, UiMessageKey> = {
  FLASHCARD: 'SHARED:APP_NAVIGATION.FLASHCARDS_LINK.LABEL',
  PRACTICE: 'SHARED:APP_NAVIGATION.PRACTICE_LINK.LABEL',
  LESSON_POST_STUDY: 'PROGRESS:PROGRESS_DASHBOARD.ACTIVITY_TYPE_SELECT.LESSON_QUIZ_OPTION_LABEL',
};

export function difficultyLabel(band: string, locale: Locale = 'en') {
  const t = uiTranslator(locale);

  return t(
    (
      {
        REMEDIAL: 'SHARED:DIFFICULTY_OPTIONS.REVIEW.LABEL',
        STANDARD: 'SHARED:DIFFICULTY_OPTIONS.STANDARD.LABEL',
        STRETCH: 'SHARED:DIFFICULTY_OPTIONS.STRETCH.LABEL',
      } as Record<string, UiMessageKey>
    )[band] ?? 'SHARED:VALUE_FORMATTING.UNAVAILABLE_VALUE.LABEL',
  );
}

export function sessionStatusLabel(status: string, locale: Locale = 'en') {
  const t = uiTranslator(locale);

  return t(
    (
      {
        GENERATED: 'PROGRESS:SESSION_STATUS.READY.LABEL',
        ACTIVE: 'PROGRESS:SESSION_STATUS.IN_PROGRESS.LABEL',
        IN_PROGRESS: 'PROGRESS:SESSION_STATUS.IN_PROGRESS.LABEL',
        COMPLETED: 'SHARED:LEARNING_STATUS.COMPLETED.LABEL',
        ABANDONED: 'PROGRESS:SESSION_STATUS.ENDED.LABEL',
        UNKNOWN: 'PROGRESS:SESSION_STATUS.UNKNOWN.LABEL',
      } as Record<string, UiMessageKey>
    )[status] ?? 'PROGRESS:SESSION_STATUS.UNKNOWN.LABEL',
  );
}

export function progressTime(
  value: string | null,
  locale: Locale = 'en',
  { timeZone = 'UTC', showTimeZone = true }: { timeZone?: string; showTimeZone?: boolean } = {},
) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return uiTranslator(locale)('SHARED:VALUE_FORMATTING.UNAVAILABLE_VALUE.LABEL');

  return createFormatter({ locale, timeZone }).dateTime(new Date(value), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: showTimeZone ? 'short' : undefined,
  });
}

export function progressNumber(value: number, locale: Locale = 'en') {
  return createFormatter({ locale }).number(value, {
    maximumFractionDigits: 1,
  });
}
