import { type PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { Env } from '../config/env.js';
import { getLogger } from '../logging/logger.js';
import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;

let dbClient: Database | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

export function createDatabase(env: Pick<Env, 'DATABASE_URL'>): Database {
  const logger = getLogger();

  sqlClient = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });

  logger.info('PostgreSQL connection pool created', { maxConnections: 10 });

  dbClient = drizzle(sqlClient, { schema });
  return dbClient;
}

export function getDatabase(): Database {
  if (!dbClient) {
    throw new Error('Database not initialized. Call createDatabase first.');
  }
  return dbClient;
}

export async function closeDatabase(): Promise<void> {
  const logger = getLogger();

  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
    dbClient = null;
    logger.info('PostgreSQL connection pool closed');
  }
}
