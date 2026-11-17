import { z } from 'zod';

export const localeSchema = z.enum(['en', 'id']);

export type Locale = z.infer<typeof localeSchema>;

export interface UserPreferences {
  contentLocale: Locale;
  uiLocale: Locale;
}

export const defaultPreferences: UserPreferences = { contentLocale: 'en', uiLocale: 'en' };

export interface Localization {
  requestedLocale: Locale;
  resolvedLocale: Locale;
  isFallback: boolean;
  contentRevision: number;
  translationRevision: number;
}

export function resolveLocale(explicit?: Locale, stored?: Locale): Locale {
  return explicit ?? stored ?? 'en';
}

export function uiLocaleCookie(cookie: string | null): Locale {
  const value = cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('kotobahub-ui-locale='))
    ?.split('=')[1];

  return localeSchema.safeParse(value).success ? (value as Locale) : 'en';
}
