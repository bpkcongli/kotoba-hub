import { defaultPreferences, type Locale, type UserPreferences } from '@/shared/locale';
import { registerMockStateReset } from './reset';
import { getMockSession } from './session';

const preferences = new Map<string, UserPreferences>();

export function getMockPreferences() {
  return { ...(preferences.get(getMockSession().user?.id ?? '') ?? defaultPreferences) };
}

export function patchMockPreferences(patch: Partial<UserPreferences>) {
  const next = { ...getMockPreferences(), ...patch };

  preferences.set(getMockSession().user!.id, next);

  return next;
}

registerMockStateReset(() => preferences.clear());

// Existing UI fixtures contain audited English only, so Indonesian requests visibly fall back.
export function localizedFixture<T>(value: T, requestedLocale: Locale): T {
  if (Array.isArray(value)) return value.map((row) => localizedFixture(row, requestedLocale)) as T;
  if (!value || typeof value !== 'object') return value;

  const row = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, localizedFixture(item, requestedLocale)]),
  );

  if ('title' in row || 'blockType' in row || ('questionType' in row && 'promptPayload' in row))
    row.localization = {
      requestedLocale,
      resolvedLocale: 'en',
      isFallback: requestedLocale !== 'en',
      contentRevision: 1,
      translationRevision: 1,
    };

  if ('englishTranslation' in row) {
    row.translation = row.englishTranslation;
    delete row.englishTranslation;
  }

  return row as T;
}
