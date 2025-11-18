import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { getAccessTokenForUser, getClientCredentialsToken } from '../../../../lib/spotify';

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
    const resp = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    let status = resp.status;
    let body: any = null;
    try {
      body = await resp.json();
    } catch (e) {
      try {
        body = await resp.text();
      } catch (e2) {
        body = null;
      }
    }

    let fallbackUsed = false;
    let fallbackStatus: number | null = null;

    if (status >= 400) {
      const ccToken = await getClientCredentialsToken();
      if (ccToken) {
        const resp2 = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, { headers: { Authorization: `Bearer ${ccToken}` } });
        fallbackUsed = true;
        fallbackStatus = resp2.status;
        status = resp2.status;
        try { body = await resp2.json(); } catch { try { body = await resp2.text(); } catch {} }
      }
    }

    const out: any = { ok: true, id, data: body };
    if (debug) {
      out._debug = {
        authSource,
        hasUserId: !!userId,
        usedLocalAccessCookie: !!localAccess,
        dbAvailable: Boolean(process.env.DATABASE_URL),
        spotifyStatus: status,
        fallbackUsed,
        fallbackStatus,
        spotifyBodySample: typeof body === 'object' ? (body.error ? body.error : Object.keys(body).slice(0,5)) : String(body).slice(0,200),
      };
    }

    // If Spotify responded non-2xx, mirror that status for easier debugging
    if (status >= 400 && !debug) {
      return res.status(status).json({ error: 'spotify_error', status, body });
    }

    return res.status(200).json(out);
  } catch (e: any) {
    if (debug) {
      return res.status(500).json({ error: 'fetch_failed', message: String(e), _debug: { authSource, hasUserId: !!userId } });
    }
    return res.status(500).json({ error: 'fetch_failed', message: String(e) });
  }
}
