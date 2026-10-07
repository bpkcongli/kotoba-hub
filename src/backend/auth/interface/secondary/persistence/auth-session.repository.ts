import { eq } from 'drizzle-orm';
import type { AuthSessionPort } from '@/backend/auth/application/ports/auth-session.port';
import { AuthSession } from '@/backend/auth/domain/entities/auth-session';
import { sessions } from '@/backend/auth/infrastructure/database/schema';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';

export class AuthSessionRepository implements AuthSessionPort {
  async findByToken(token: string): Promise<AuthSession | null> {
    const [row] = await getDatabase()
      .select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.sessionToken, token))
      .limit(1);

    return row ? new AuthSession(row) : null;
  }

  async deleteByToken(token: string): Promise<void> {
    await getDatabase().delete(sessions).where(eq(sessions.sessionToken, token));
  }
}

export const authSessionRepository = new AuthSessionRepository();
