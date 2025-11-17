import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { getAccessTokenForUser } from '../../../../lib/spotify';

async function fetchWithToken(url: string, token: string) {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return resp.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as any;
  if (!id) return res.status(400).json({ error: 'missing_id' });

  const cookies = cookie.parse(req.headers.cookie || '');
  const userId = cookies.user_id as string | undefined;
  const localAccess = cookies.access_token as string | undefined;

  const debug = req.query.debug === '1' || req.query.debug === 'true';

  let token: string | null = null;
  let authSource: 'db' | 'cookie' | null = null;
  if (userId) {
    token = await getAccessTokenForUser(userId);
    if (token) authSource = 'db';
  }
  if (!token && localAccess) {
    token = localAccess;
    authSource = 'cookie';
  }
  if (!token) return res.status(401).json({ error: 'not_authenticated' });

  try {
    const data = await fetchWithToken(`https://api.spotify.com/v1/audio-features/${id}`, token);
    const out: any = { ok: true, id, data };
    if (debug) {
      out._debug = {
        authSource,
        hasUserId: !!userId,
        usedLocalAccessCookie: !!localAccess,
        dbAvailable: Boolean(process.env.DATABASE_URL),
      };
    }
    return res.status(200).json(out);
  } catch (e: any) {
    if (debug) {
      return res.status(500).json({ error: 'fetch_failed', message: String(e), _debug: { authSource, hasUserId: !!userId } });
    }
    return res.status(500).json({ error: 'fetch_failed', message: String(e) });
  }
}
