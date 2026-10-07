import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from 'next-auth/adapters';
import { accounts, sessions } from '@/backend/auth/infrastructure/database/schema';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import type { AuthUserPort } from '@/backend/users/application/ports/auth-user.port';
import type { AuthUser } from '@/backend/users/domain/entities/auth-user';

function toAdapterUser(user: AuthUser): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    name: user.displayName,
    image: user.avatarUrl,
    emailVerified: user.emailVerified ? user.createdAt : null,
  };
}

function toAdapterSession(row: typeof sessions.$inferSelect): AdapterSession {
  return { sessionToken: row.sessionToken, userId: row.userId, expires: row.expiresAt };
}

function toAdapterAccount(row: typeof accounts.$inferSelect): AdapterAccount {
  return {
    userId: row.userId,
    provider: row.provider,
    providerAccountId: row.providerAccountId,
    type: 'oidc',
  };
}

export function createAuthJsAdapter(userPort: AuthUserPort): Adapter {
  return {
    createUser: async (user) => {
      const created = await userPort.create({
        id: randomUUID(),
        email: user.email,
        displayName: user.name || user.email,
        avatarUrl: user.image ?? null,
        emailVerified: user.emailVerified !== null,
      });

      return toAdapterUser(created);
    },

    getUser: async (id) => {
      const user = await userPort.findById(id);

      return user ? toAdapterUser(user) : null;
    },

    getUserByEmail: async (email) => {
      const user = await userPort.findByEmail(email);

      return user ? toAdapterUser(user) : null;
    },

    getUserByAccount: async ({ provider, providerAccountId }) => {
      const [account] = await getDatabase()
        .select({ userId: accounts.userId })
        .from(accounts)
        .where(
          and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)),
        )
        .limit(1);

      if (!account) return null;
      const user = await userPort.findById(account.userId);

      return user ? toAdapterUser(user) : null;
    },

    updateUser: async (user) => {
      const updated = await userPort.update({
        id: user.id,
        ...(user.email !== undefined ? { email: user.email } : {}),
        ...(user.name !== undefined ? { displayName: user.name || user.email || '' } : {}),
        ...(user.image !== undefined ? { avatarUrl: user.image } : {}),
        ...(user.emailVerified !== undefined ? { emailVerified: user.emailVerified !== null } : {}),
      });

      return toAdapterUser(updated);
    },

    linkAccount: async (account) => {
      await getDatabase().insert(accounts).values({
        id: randomUUID(),
        userId: account.userId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        providerEmail: null,
      });

      return account;
    },

    getAccount: async (providerAccountId, provider) => {
      const [row] = await getDatabase()
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)),
        )
        .limit(1);

      return row ? toAdapterAccount(row) : null;
    },

    createSession: async (session) => {
      await getDatabase().insert(sessions).values({
        id: randomUUID(),
        userId: session.userId,
        sessionToken: session.sessionToken,
        expiresAt: session.expires,
      });
      await userPort.recordLogin(session.userId);

      return session;
    },

    getSessionAndUser: async (sessionToken) => {
      const [row] = await getDatabase()
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, sessionToken))
        .limit(1);

      if (!row || row.expiresAt <= new Date()) return null;
      const user = await userPort.findById(row.userId);

      return user ? { session: toAdapterSession(row), user: toAdapterUser(user) } : null;
    },

    updateSession: async (session) => {
      const [row] = await getDatabase()
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, session.sessionToken))
        .limit(1);

      if (!row) return null;
      if (session.expires) {
        await getDatabase()
          .update(sessions)
          .set({ expiresAt: session.expires })
          .where(eq(sessions.sessionToken, session.sessionToken));
      }

      return { ...toAdapterSession(row), expires: session.expires ?? row.expiresAt };
    },

    deleteSession: async (sessionToken) => {
      await getDatabase().delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    },
  };
}
