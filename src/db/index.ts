import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL || '';

let client: postgres.Sql | null = null;
let pgDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (databaseUrl && databaseUrl.trim() && !databaseUrl.includes('localhost:5432/postgres')) {
  try {
    client = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined
    });
    pgDb = drizzle(client, { schema });
    console.log('[Dalani Database] Initialized Drizzle ORM PostgreSQL connection pool.');
  } catch (err) {
    console.warn('[Dalani Database] Failed to initialize PostgreSQL client:', err);
  }
} else if (databaseUrl && databaseUrl.trim()) {
  try {
    client = postgres(databaseUrl, {
      max: 5,
      idle_timeout: 10,
      connect_timeout: 5
    });
    pgDb = drizzle(client, { schema });
    console.log('[Dalani Database] Initialized local PostgreSQL connection pool.');
  } catch (err) {
    console.warn('[Dalani Database] Local PostgreSQL connection pool initialization failed:', err);
  }
}

export { pgDb as db, client, schema };

export async function checkPostgresConnection(): Promise<boolean> {
  if (!pgDb || !client) return false;
  try {
    await client`SELECT 1`;
    return true;
  } catch (err) {
    console.warn('[Dalani Database] PostgreSQL connection check failed:', (err as any)?.message || err);
    return false;
  }
}
