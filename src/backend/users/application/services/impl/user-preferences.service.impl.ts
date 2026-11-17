import type { UserPreferencesService } from '@/backend/users/application/services/user-preferences.service';
import type { UserPreferencesRepository } from '@/backend/users/domain/repositories/user-preferences.repository';
import { preferencesPatchSchema } from '@/backend/users/domain/value-objects/user-preferences';
import { defaultPreferences, type UserPreferences } from '@/shared/locale';

export class UserPreferencesServiceImpl implements UserPreferencesService {
  constructor(private readonly repository: UserPreferencesRepository) {}

  async get(userId: string) {
    return (await this.repository.get(userId)) ?? { ...defaultPreferences };
  }

  patch(userId: string, patch: Partial<UserPreferences>) {
    return this.repository.patch(userId, preferencesPatchSchema.parse(patch));
  }
}
