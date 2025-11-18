import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccessTokenForUser } from '../../../lib/spotify';
import { pool, dbAvailable } from '../../../lib/db';
import { getKeyForTrack } from '../../../lib/keys';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ ok: false, error: 'invalid_id' });

  // If cached, return quickly
  try {
    if (dbAvailable && pool) {
      const { rows } = await pool.query(
        'SELECT track_id, source, key, mode, confidence, mbid, title, artist, updated_at FROM keys_cache WHERE track_id = $1',
        [id]
      );
      if (rows.length) {
        return res.status(200).json({ ok: true, cached: true, ...rows[0] });
      }
    }
  } catch (e: any) {
    // continue to compute if cache read fails
  }

  // Need a Spotify access token bound to a user
  const { user_id, spotifyId: legacySpotifyId } = req.cookies as any;
  const spotifyId = user_id || legacySpotifyId;
  if (!spotifyId) return res.status(401).json({ ok: false, error: 'not_authenticated' });

  let accessToken: string | null = null;
  try {
    const tokenInfo = await getAccessTokenForUser(spotifyId);
    accessToken = tokenInfo ?? null;
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: 'token_error', detail: String(e) });
  }
  if (!accessToken) return res.status(401).json({ ok: false, error: 'no_access_token' });

  try {
    const result = await getKeyForTrack(id, accessToken);
    if (!result) return res.status(404).json({ ok: false, error: 'not_found' });

    // write-through cache (best-effort; lib/keys also caches but we ensure persistence)
    try {
      if (dbAvailable && pool) {
        await pool.query(
          `INSERT INTO keys_cache (track_id, source, key, mode, confidence, mbid, title, artist)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (track_id) DO UPDATE SET
             source = EXCLUDED.source,
             key = EXCLUDED.key,
             mode = EXCLUDED.mode,
             confidence = EXCLUDED.confidence,
             mbid = EXCLUDED.mbid,
             title = EXCLUDED.title,
             artist = EXCLUDED.artist,
             updated_at = now()`,
          [id, result.source, result.key, result.mode, result.confidence ?? null, result.mbid ?? null, result.title ?? null, result.artist ?? null]
        );
      }
    } catch {}

    return res.status(200).json({ ok: true, cached: false, track_id: id, ...result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: 'resolve_failed', detail: String(e) });
  }
}
