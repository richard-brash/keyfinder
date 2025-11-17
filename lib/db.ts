import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';

// Only create a Pool when we actually have a DATABASE_URL. Creating a Pool
// with an empty connection string can cause confusing errors in some
// environments (e.g. Railway container startup). Export `dbAvailable` so
// other modules can guard DB usage.
export const dbAvailable = Boolean(connectionString);
export const pool: Pool | null = dbAvailable ? new Pool({ connectionString }) : null;

export async function ensureSchema() {
  if (!dbAvailable || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      spotify_id TEXT UNIQUE NOT NULL,
      refresh_token TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);
}
