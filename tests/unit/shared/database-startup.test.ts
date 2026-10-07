import { register } from '@/instrumentation';

describe('database startup validation', () => {
  const originalRuntime = process.env.NEXT_RUNTIME;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSecret = process.env.AUTH_SECRET;
  const originalGoogleId = process.env.AUTH_GOOGLE_ID;
  const originalGoogleSecret = process.env.AUTH_GOOGLE_SECRET;

  afterEach(() => {
    if (originalRuntime === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = originalRuntime;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
    if (originalGoogleId === undefined) delete process.env.AUTH_GOOGLE_ID;
    else process.env.AUTH_GOOGLE_ID = originalGoogleId;
    if (originalGoogleSecret === undefined) delete process.env.AUTH_GOOGLE_SECRET;
    else process.env.AUTH_GOOGLE_SECRET = originalGoogleSecret;
  });

  it('rejects an invalid URL before the Node.js server accepts requests', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.DATABASE_URL = 'not-a-mysql-url';

    await expect(register()).rejects.toThrow('DATABASE_URL must be a valid mysql:// URL.');
  });

  it('leaves the Edge runtime independent of the MySQL driver', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    delete process.env.DATABASE_URL;

    await expect(register()).resolves.toBeUndefined();
  });

  it('rejects missing Google credentials during Node.js startup', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.DATABASE_URL = 'mysql://learner:secret@localhost:3306/kotoba_test';
    process.env.AUTH_SECRET = 'a'.repeat(32);
    delete process.env.AUTH_GOOGLE_ID;
    process.env.AUTH_GOOGLE_SECRET = 'secret';

    await expect(register()).rejects.toThrow('AUTH_GOOGLE_ID is required.');
  });
});
