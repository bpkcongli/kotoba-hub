import type { UserPreferences } from '@/shared/locale';

export interface UserPreferencesRepository {
  get(userId: string): Promise<UserPreferences | null>;

  patch(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences>;
}
