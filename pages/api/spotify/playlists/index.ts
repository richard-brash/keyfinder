import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { getAccessTokenForUser } from '../../../../lib/spotify';

async function fetchWithToken(url: string, token: string) {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return resp.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const userId = cookies.user_id as string | undefined;

  // local-dev fallback to access_token cookie
  const localAccess = cookies.access_token as string | undefined;

  let token: string | null = null;
  if (userId) {
    token = await getAccessTokenForUser(userId);
  }
  if (!token && localAccess) token = localAccess;
  if (!token) return res.status(401).json({ error: 'not_authenticated' });

  const data = await fetchWithToken('https://api.spotify.com/v1/me/playlists?limit=50', token);
  res.status(200).json(data);
}
