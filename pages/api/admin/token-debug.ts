import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { getAccessTokenForUser } from '../../../lib/spotify';

function mask(s: string | null | undefined) {
  if (!s) return null;
  if (s.length <= 8) return s.replace(/./g, '*');
  return s.slice(0, 4) + '…' + s.slice(-4);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const userId = cookies.user_id as string | undefined;
  const localAccess = cookies.access_token as string | undefined;

  if (!userId && !localAccess) return res.status(401).json({ error: 'not_authenticated' });

  const trackId = String(req.query.id || req.query.track || '');
  if (!trackId) return res.status(400).json({ error: 'missing_track_id', example: '/api/admin/token-debug?id=7cNRqg0lbiqBaGeOlA4AEU' });

  let token: string | null = null;
  let authSource: 'db' | 'cookie' | null = null;
  try {
    if (userId) {
      token = await getAccessTokenForUser(userId);
      if (token) authSource = 'db';
    }
  } catch (e: any) {
    // continue; we'll try local cookie below
    console.error('refresh failed', e);
  }
  if (!token && localAccess) {
    token = localAccess;
    authSource = 'cookie';
  }

  if (!token) return res.status(401).json({ error: 'no_token_available' });

  const out: any = { ok: true, authSource, tokenMasked: mask(token), tokenLength: token.length };

  try {
    const meResp = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token}` } });
    const meStatus = meResp.status;
    let meBody: any = null;
    try { meBody = await meResp.json(); } catch (e) { meBody = await meResp.text(); }
    out.me = { status: meStatus, body: meBody };
  } catch (e: any) {
    out.me = { error: String(e) };
  }

  try {
    const featsResp = await fetch(`https://api.spotify.com/v1/audio-features/${encodeURIComponent(trackId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const featsStatus = featsResp.status;
    let featsBody: any = null;
    try { featsBody = await featsResp.json(); } catch (e) { featsBody = await featsResp.text(); }
    out.features = { status: featsStatus, body: featsBody };
  } catch (e: any) {
    out.features = { error: String(e) };
  }

  return res.status(200).json(out);
}
