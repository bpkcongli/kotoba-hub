import { readDatabaseEnv } from '@/backend/shared/infrastructure/config/database-env';

describe('database environment', () => {
  it('accepts a complete MySQL URL without changing it', () => {
    const databaseUrl = 'mysql://learner:secret@localhost:3306/kotoba_test';
    expect(readDatabaseEnv({ DATABASE_URL: databaseUrl })).toEqual({ databaseUrl });
  });

  it.each([
    [undefined, 'DATABASE_URL is required'],
    ['postgres://learner:secret@localhost/kotoba_test', 'mysql:// URL'],
    ['mysql://learner:secret@localhost', 'host, user, password, and database'],
    ['mysql://learner@localhost/kotoba_test', 'host, user, password, and database'],
    ['not-a-url-with-secret', 'valid mysql:// URL'],
  ])('rejects invalid DATABASE_URL without printing credentials', (databaseUrl, expected) => {
    let message = '';
    try {
      readDatabaseEnv({ DATABASE_URL: databaseUrl });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(expected);
    expect(message).not.toContain('secret');
  });
});
