export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { readDatabaseEnv } = await import('@/backend/shared/infrastructure/config/database-env');
  readDatabaseEnv();
}
