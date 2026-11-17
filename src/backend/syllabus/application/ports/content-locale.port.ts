import type { Locale } from '@/shared/locale';

export interface ContentLocalePort {
  getContentLocale(userId: string): Promise<Locale>;
}
