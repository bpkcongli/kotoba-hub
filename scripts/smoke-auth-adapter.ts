import { randomUUID } from 'node:crypto';

const testUrl = process.env.AUTH_TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) {
  throw new Error('AUTH_TEST_DATABASE_URL must point to a database ending in _test.');
}
process.env.DATABASE_URL = testUrl;

const [
  { eq },
  { createAuthJsAdapter },
  { authUserService },
  { getSessionSnapshot, revokeSession },
  { getDatabase },
  { accounts },
  { users },
] = await Promise.all([
  import('drizzle-orm'),
  import('@/backend/auth/interface/secondary/persistence/authjs-adapter'),
  import('@/backend/users/infrastructure/di/auth-user'),
  import('@/backend/auth/infrastructure/di/session'),
  import('@/backend/shared/infrastructure/database/connection'),
  import('@/backend/auth/infrastructure/database/schema'),
  import('@/backend/users/infrastructure/database/schema'),
]);

const adapter = createAuthJsAdapter(authUserService);
const identity = randomUUID();
const accountId = randomUUID();
const token = randomUUID();
const expiredToken = randomUUID();
let userId: string | null = null;
let passed = false;

try {
  const user = await adapter.createUser!({
    id: 'external-provider-id',
    email: `auth-smoke-${identity}@example.com`,
    name: 'Adapter Smoke',
    image: null,
    emailVerified: new Date(),
  });
  userId = user.id;
  await adapter.linkAccount!({
    type: 'oidc',
    provider: 'google',
    providerAccountId: accountId,
    userId: user.id,
    access_token: 'discard-access-token',
    refresh_token: 'discard-refresh-token',
    id_token: 'discard-id-token',
  });
  const linked = await adapter.getUserByAccount!({
    provider: 'google',
    providerAccountId: accountId,
  });
  const [storedAccount] = await getDatabase()
    .select({
      accessToken: accounts.accessToken,
      refreshToken: accounts.refreshToken,
      idToken: accounts.idToken,
    })
    .from(accounts)
    .where(eq(accounts.providerAccountId, accountId))
    .limit(1);
  await adapter.createSession!({
    sessionToken: token,
    userId: user.id,
    expires: new Date(Date.now() + 60_000),
  });
  await adapter.createSession!({
    sessionToken: expiredToken,
    userId: user.id,
    expires: new Date(Date.now() - 60_000),
  });
  const pair = await adapter.getSessionAndUser!(token);
  const expiredPair = await adapter.getSessionAndUser!(expiredToken);
  const snapshot = await getSessionSnapshot(`authjs.session-token=${token}`);
  await revokeSession(token);
  const cleared = await getSessionSnapshot(`authjs.session-token=${token}`);

  if (
    user.id.length !== 36 ||
    linked?.id !== user.id ||
    storedAccount?.accessToken !== null ||
    storedAccount.refreshToken !== null ||
    storedAccount.idToken !== null ||
    pair?.user.id !== user.id ||
    expiredPair !== null ||
    snapshot.authorization.appAccess !== 'ONBOARDING_REQUIRED' ||
    !snapshot.isAuthenticated ||
    JSON.stringify(snapshot).includes(token) ||
    cleared.isAuthenticated
  ) {
    throw new Error('Auth adapter round trip did not match the session contract.');
  }
  console.log('Auth adapter MySQL round trip passed.');
  passed = true;
} catch {
  console.error('Auth adapter MySQL round trip failed.');
} finally {
  try {
    await adapter.deleteSession!(token);
    await adapter.deleteSession!(expiredToken);
    if (userId) {
      await getDatabase().delete(accounts).where(eq(accounts.userId, userId));
      await getDatabase().delete(users).where(eq(users.id, userId));
    }
  } catch {
    console.error('Auth adapter smoke cleanup failed.');
    passed = false;
  }
  process.exit(passed ? 0 : 1);
}
