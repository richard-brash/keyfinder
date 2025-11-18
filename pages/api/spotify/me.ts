import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccessTokenForUser } from '../../../lib/spotify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.cookies as any;
  
  if (!user_id) {
    return res.status(401).json({ error: 'not_authenticated', message: 'Please log in with Spotify first' });
  }

  try {
    const token = await getAccessTokenForUser(user_id);
    if (!token) {
      return res.status(401).json({ error: 'no_token', message: 'Could not get access token' });
    }

    const resp = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return res.status(resp.status).json({ 
        error: 'spotify_error', 
        status: resp.status, 
        message: errorText 
      });
    }

    const profile = await resp.json();
    return res.status(200).json(profile);
  } catch (e: any) {
    return res.status(500).json({ error: 'server_error', message: String(e) });
  }
}
