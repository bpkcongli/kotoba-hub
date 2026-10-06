import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { readDatabaseEnv } from '@/backend/shared/infrastructure/config/database-env';
import * as schema from './schema';

const globalDatabase = globalThis as typeof globalThis & { kotobaDatabasePool?: Pool };
let productionPool: Pool | undefined;

function getPool(): Pool {
  const existingPool =
    process.env.NODE_ENV === 'production' ? productionPool : globalDatabase.kotobaDatabasePool;
  if (existingPool) return existingPool;

  const pool = createPool({
    uri: readDatabaseEnv().databaseUrl,
    connectionLimit: 10,
    timezone: 'Z',
  });

  if (process.env.NODE_ENV === 'production') productionPool = pool;
  else globalDatabase.kotobaDatabasePool = pool;
  return pool;
}

export function getDatabase() {
  return drizzle(getPool(), { schema, mode: 'default' });
}
