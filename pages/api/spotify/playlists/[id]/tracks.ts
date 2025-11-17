import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { getAccessTokenForUser } from '../../../../../lib/spotify';

async function fetchWithToken(url: string, token: string) {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return resp.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as any;
  const debug = req.query.debug === '1' || req.query.debug === 'true';
  const cookies = cookie.parse(req.headers.cookie || '');
  const userId = cookies.user_id as string | undefined;
  const localAccess = cookies.access_token as string | undefined;

  let token: string | null = null;
  if (userId) token = await getAccessTokenForUser(userId);
  if (!token && localAccess) token = localAccess;
  if (!token) return res.status(401).json({ error: 'not_authenticated' });

  const tracksResp = await fetchWithToken(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`, token);
  const items = tracksResp.items || [];

  const ids = items.map((it: any) => it.track && it.track.id).filter(Boolean).slice(0, 100);
  let features: any = {};
  let featsResp: any = null;
  if (ids.length) {
    try {
      featsResp = await fetchWithToken(`https://api.spotify.com/v1/audio-features?ids=${ids.join(',')}`, token);
      if (featsResp && featsResp.audio_features) {
        featsResp.audio_features.forEach((f: any) => {
          if (f) features[f.id] = f;
        });
      }
    } catch (e: any) {
      // Surface fetch error in debug mode
      if (debug) {
        return res.status(500).json({ error: 'audio-features-fetch-failed', message: String(e) });
      }
    }
  }

  const withFeatures = items.map((it: any) => ({ ...it, audio_features: (it.track && features[it.track.id]) || null }));

  if (debug) {
    // Return diagnostic info to help trace why features are missing
    const safeFeats = Array.isArray(featsResp?.audio_features)
      ? featsResp.audio_features.slice(0, 20).map((f: any) => ({ id: f?.id ?? null, _available: !!f }))
      : null;
    return res.status(200).json({
      meta: {
        requestedIdsCount: ids.length,
        requestedIdsSample: ids.slice(0, 10),
        itemsCount: items.length,
      },
      featsSample: safeFeats,
      tracksSample: items.slice(0, 6).map((it: any) => ({ id: it.track?.id ?? null, name: it.track?.name ?? null })),
      items: withFeatures,
    });
  }

  res.status(200).json({ items: withFeatures });
}
