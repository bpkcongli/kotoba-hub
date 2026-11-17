import type { UserPreferences } from '@/shared/locale';

export interface UserPreferencesService {
  get(userId: string): Promise<UserPreferences>;

  patch(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences>;
}
