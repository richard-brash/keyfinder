import type { NextApiRequest, NextApiResponse } from 'next';
import { dbAvailable, pool, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!dbAvailable || !pool) {
    return res.status(400).json({ ok: false, message: 'DATABASE_URL is not configured. Set DATABASE_URL in Railway project environment variables.' });
  }

  try {
    await ensureSchema();

    // simple sanity check: ensure we can query the users table (may be empty)
    const r = await pool.query("SELECT to_regclass('public.users') AS table_exists");
    const tableExists = r.rows && r.rows[0] && r.rows[0].table_exists !== null;

    return res.status(200).json({ ok: true, tableExists });
  } catch (err) {
    console.error('init-db error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
