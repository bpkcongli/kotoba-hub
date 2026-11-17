import type { UserPreferences } from '@/shared/locale';

export interface ILocaleService {
  get(signal?: AbortSignal): Promise<UserPreferences>;

  patch(value: Partial<UserPreferences>, signal?: AbortSignal): Promise<UserPreferences>;
}
