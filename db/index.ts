import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Create a database connection using Neon's serverless driver
 * This is optimized for serverless environments like Vercel
 */
function createDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

// Export a singleton database instance
export const db = createDb();

// Re-export schema for convenience
export * from './schema';
