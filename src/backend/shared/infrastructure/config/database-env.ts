export interface DatabaseEnv {
  databaseUrl: string;
}

export function readDatabaseEnv(
  environment: { DATABASE_URL?: string } = { DATABASE_URL: process.env.DATABASE_URL },
): DatabaseEnv {
  const value = environment.DATABASE_URL;
  if (!value) {
    throw new Error('DATABASE_URL is required for database access and migrations.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a valid mysql:// URL.');
  }

  if (
    url.protocol !== 'mysql:' ||
    !url.hostname ||
    !url.username ||
    !url.password ||
    url.pathname.length < 2 ||
    url.hash
  ) {
    throw new Error('DATABASE_URL must be a mysql:// URL with host, user, password, and database.');
  }

  return { databaseUrl: value };
}
