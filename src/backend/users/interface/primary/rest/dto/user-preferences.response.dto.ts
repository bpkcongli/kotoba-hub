import type { UserPreferences } from '@/shared/locale';

export function toUserPreferencesDto(preferences: UserPreferences) {
  return { contentLocale: preferences.contentLocale, uiLocale: preferences.uiLocale };
}
