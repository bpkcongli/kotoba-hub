import type { ContentLocalePort } from '@/backend/practice/application/ports/content-locale.port';
import type { UserPreferencesService } from '@/backend/users/application/services/user-preferences.service';

export class ContentLocaleAdapter implements ContentLocalePort {
  constructor(private readonly preferences: UserPreferencesService) {}

  async getContentLocale(userId: string) {
    return (await this.preferences.get(userId)).contentLocale;
  }
}
