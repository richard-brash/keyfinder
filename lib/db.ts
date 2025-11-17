import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  // During local dev we may not have a DB; code should handle missing DB gracefully.
  // When deploying to Railway, set DATABASE_URL.
}

export const pool = new Pool({ connectionString });

export async function ensureSchema() {
  if (!connectionString) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      spotify_id TEXT UNIQUE NOT NULL,
      refresh_token TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);
}
