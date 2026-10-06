import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { readDatabaseEnv } from './src/backend/shared/infrastructure/config/database-env';

// Schema generation is offline; migration requires validated credentials.
const needsDatabaseUrl = process.argv.includes('migrate') || process.env.DATABASE_URL !== undefined;
const databaseUrl = needsDatabaseUrl ? readDatabaseEnv().databaseUrl : undefined;

export default defineConfig({
  dialect: 'mysql',
  schema: './src/backend/shared/infrastructure/database/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
