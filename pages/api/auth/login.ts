import type { NextApiRequest, NextApiResponse } from 'next';

const scopes = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read'
].join(' ');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId) {
    // Friendly error for local dev when .env.local isn't configured
    res.status(500).send('Missing SPOTIFY_CLIENT_ID environment variable. Create a .env.local with your Spotify credentials (see README).');
    return;
  }

  if (!redirectUri) {
    res.status(500).send('Missing SPOTIFY_REDIRECT_URI environment variable. Create a .env.local with your Spotify app redirect URI (see README).');
    return;
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
  });

  res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
}
