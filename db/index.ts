import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type DbClient = ReturnType<typeof drizzle>;
let dbInstance: DbClient | null = null;

/**
 * Lazily create a database connection using Neon's serverless driver.
 * This avoids eager initialization during module import in dev.
 */
export function getDb(): DbClient {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);
  dbInstance = drizzle(sql, { schema });
  return dbInstance;
}

// Re-export schema for convenience
export * from './schema';
