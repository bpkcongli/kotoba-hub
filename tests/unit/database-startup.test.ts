import { register } from '@/instrumentation';

describe('database startup validation', () => {
  const originalRuntime = process.env.NEXT_RUNTIME;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalRuntime === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = originalRuntime;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
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
});
