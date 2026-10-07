import { eq } from 'drizzle-orm';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import type {
  AuthUserPort,
  CreateAuthUser,
  UpdateAuthUser,
} from '@/backend/users/application/ports/auth-user.port';
import { AuthUser } from '@/backend/users/domain/entities/auth-user';
import { learnerProfiles, users } from '@/backend/users/infrastructure/database/schema';

function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  return new AuthUser({
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
  });
}

export class AuthUserRepository implements AuthUserPort {
  async create(input: CreateAuthUser): Promise<AuthUser> {
    await getDatabase().insert(users).values(input);

    const created = await this.findById(input.id);
    if (!created) throw new Error('New user could not be read.');

    return created;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const [row] = await getDatabase().select().from(users).where(eq(users.id, id)).limit(1);

    return row ? toAuthUser(row) : null;
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const [row] = await getDatabase().select().from(users).where(eq(users.email, email)).limit(1);

    return row ? toAuthUser(row) : null;
  }

  async update(input: UpdateAuthUser): Promise<AuthUser> {
    const { id, ...values } = input;

    if (Object.keys(values).length) {
      await getDatabase().update(users).set(values).where(eq(users.id, id));
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error('User not found.');

    return updated;
  }

  async recordLogin(id: string): Promise<void> {
    await getDatabase().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async isOnboardingComplete(id: string): Promise<boolean> {
    const [profile] = await getDatabase()
      .select({ completed: learnerProfiles.onboardingCompleted })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, id))
      .limit(1);

    return profile?.completed === true;
  }
}

export const authUserRepository = new AuthUserRepository();
