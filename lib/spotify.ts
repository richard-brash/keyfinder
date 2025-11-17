import { pool, dbAvailable } from './db';

export async function getAccessTokenForUser(spotifyId: string): Promise<string | null> {
  if (!dbAvailable || !pool) return null;

  const r = await pool.query('SELECT refresh_token FROM users WHERE spotify_id = $1', [spotifyId]);
  if (!r.rows || r.rows.length === 0) return null;
  const refreshToken = r.rows[0].refresh_token as string | null;
  if (!refreshToken) return null;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  const json = await resp.json();
  if (json.error) throw new Error('Failed to refresh token: ' + JSON.stringify(json));

  const accessToken = json.access_token as string | undefined;
  const newRefresh = json.refresh_token as string | undefined;

  if (newRefresh && pool) {
    await pool.query('UPDATE users SET refresh_token = $1, updated_at = now() WHERE spotify_id = $2', [newRefresh, spotifyId]);
  }

  return accessToken || null;
}
