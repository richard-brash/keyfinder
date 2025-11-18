import type { NextApiRequest, NextApiResponse } from 'next';
import { pool, dbAvailable } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!dbAvailable || !pool) return res.status(500).json({ ok: false, error: 'db_unavailable' });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS keys_cache (
        track_id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        key INT NOT NULL,
        mode INT NOT NULL,
        confidence REAL NULL,
        mbid TEXT NULL,
        title TEXT NULL,
        artist TEXT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    return res.status(200).json({ ok: true, table: 'keys_cache' });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
