import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { getAccessTokenForUser } from '../../../../lib/spotify';

async function fetchWithToken(url: string, token: string) {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return resp.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as any;
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
  if (ids.length) {
    const featsResp = await fetchWithToken(`https://api.spotify.com/v1/audio-features?ids=${ids.join(',')}`, token);
    if (featsResp && featsResp.audio_features) {
      featsResp.audio_features.forEach((f: any) => {
        if (f) features[f.id] = f;
      });
    }
  }

  const withFeatures = items.map((it: any) => ({ ...it, audio_features: features[it.track.id] || null }));

  res.status(200).json({ items: withFeatures });
}
