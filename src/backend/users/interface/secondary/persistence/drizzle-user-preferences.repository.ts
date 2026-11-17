import { eq } from 'drizzle-orm';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import type { UserPreferencesRepository } from '@/backend/users/domain/repositories/user-preferences.repository';
import { userPreferences } from '@/backend/users/infrastructure/database/schema';
import type { UserPreferences } from '@/shared/locale';

export class DrizzleUserPreferencesRepository implements UserPreferencesRepository {
  async get(userId: string) {
    const [row] = await getDatabase()
      .select({
        contentLocale: userPreferences.contentLocale,
        uiLocale: userPreferences.uiLocale,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    return row ?? null;
  }

  async patch(userId: string, patch: Partial<UserPreferences>) {
    return getDatabase().transaction(async (tx) => {
      await tx
        .insert(userPreferences)
        .values({ userId, ...patch })
        .onDuplicateKeyUpdate({ set: patch });

      const [row] = await tx
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));

      return { contentLocale: row.contentLocale, uiLocale: row.uiLocale };
    });
  }
}

export const userPreferencesRepository = new DrizzleUserPreferencesRepository();
