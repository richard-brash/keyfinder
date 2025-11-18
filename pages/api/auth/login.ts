import type { NextApiRequest, NextApiResponse } from 'next';

const scopes = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read'
].join(' ');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ 
      error: 'missing_credentials',
      message: 'SPOTIFY_CLIENT_ID and SPOTIFY_REDIRECT_URI must be set' 
    });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
  });

  res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
}
