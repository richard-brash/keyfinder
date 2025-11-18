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

  const revealRequested = String(req.query.reveal || '').toLowerCase() === '1' || String(req.query.reveal || '').toLowerCase() === 'true';
  const revealSecret = process.env.TOKEN_REVEAL_SECRET || '';
  const providedSecret = String(req.query.secret || '');

  const out: any = { ok: true, authSource, tokenMasked: mask(token), tokenLength: token.length };
  if (revealRequested && revealSecret && providedSecret && providedSecret === revealSecret) {
    out.accessToken = token; // TEMPORARY: guarded by TOKEN_REVEAL_SECRET
    out.reveal = true;
  }

  try {
    const meResp = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token}` } });
    const meStatus = meResp.status;
    let meBody: any = null;
    try { meBody = await meResp.json(); } catch (e) { meBody = await meResp.text(); }
    const meHeaders = Object.fromEntries(meResp.headers ? (meResp.headers as any).entries() : []);
    out.me = { status: meStatus, headers: meHeaders, body: meBody };
  } catch (e: any) {
    out.me = { error: String(e) };
  }

  try {
    const featsResp = await fetch(`https://api.spotify.com/v1/audio-features/${encodeURIComponent(trackId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const featsStatus = featsResp.status;
    let featsBody: any = null;
    try { featsBody = await featsResp.json(); } catch (e) { featsBody = await featsResp.text(); }
    const featsHeaders = Object.fromEntries(featsResp.headers ? (featsResp.headers as any).entries() : []);
    out.features = { status: featsStatus, headers: featsHeaders, body: featsBody };
  } catch (e: any) {
    out.features = { error: String(e) };
  }

  // Also fetch the track metadata and the batch audio-features endpoint for extra clues
  try {
    const trackResp = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const trackStatus = trackResp.status;
    let trackBody: any = null;
    try { trackBody = await trackResp.json(); } catch (e) { trackBody = await trackResp.text(); }
    const trackHeaders = Object.fromEntries(trackResp.headers ? (trackResp.headers as any).entries() : []);
    out.track = { status: trackStatus, headers: trackHeaders, body: trackBody };
  } catch (e: any) {
    out.track = { error: String(e) };
  }

  try {
    const ids = encodeURIComponent(trackId);
    const batchResp = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, { headers: { Authorization: `Bearer ${token}` } });
    const batchStatus = batchResp.status;
    let batchBody: any = null;
    try { batchBody = await batchResp.json(); } catch (e) { batchBody = await batchResp.text(); }
    const batchHeaders = Object.fromEntries(batchResp.headers ? (batchResp.headers as any).entries() : []);
    out.featuresBatch = { status: batchStatus, headers: batchHeaders, body: batchBody };
  } catch (e: any) {
    out.featuresBatch = { error: String(e) };
  }

  return res.status(200).json(out);
}
