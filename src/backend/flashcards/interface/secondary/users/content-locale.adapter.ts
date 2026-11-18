import type { FlashcardContentLocalePort } from '@/backend/flashcards/application/ports/content-locale.port';
import type { UserPreferencesService } from '@/backend/users/application/services/user-preferences.service';

export class FlashcardContentLocaleAdapter implements FlashcardContentLocalePort {
  constructor(private readonly preferences: UserPreferencesService) {}

  async getContentLocale(userId: string) {
    return (await this.preferences.get(userId)).contentLocale;
  }
}
