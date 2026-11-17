import type { StoreError } from '@/frontend/shared/interfaces';
import type { Locale, UserPreferences } from '@/shared/locale';

export interface ILocaleStore {
  preferences: UserPreferences;

  localizedSyllabus: boolean;

  isSaving: boolean;

  error: StoreError | null;

  readonly contentQuery: { contentFormat?: 'localized'; contentLocale?: Locale };

  hydrate(preferences: UserPreferences, localizedSyllabus: boolean): void;

  setContentLocale(locale: Locale): Promise<void>;

  reset(): void;

  dispose(): void;
}
