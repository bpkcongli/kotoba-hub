import type { Locale } from '@/shared/locale';

export interface FlashcardContentLocalePort {
  getContentLocale(userId: string): Promise<Locale>;
}
