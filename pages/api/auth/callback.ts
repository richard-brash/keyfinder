import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { pool, ensureSchema } from '../../../lib/db';

async function exchangeCode(code: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri || ''
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  return resp.json();
}

async function getSpotifyProfile(accessToken: string) {
  const resp = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } });
  return resp.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error } = req.query as any;
  if (error) return res.status(400).send(error);
  if (!code) return res.status(400).send('missing code');

  const tokenResp = await exchangeCode(code);
  if (tokenResp.error) return res.status(400).json(tokenResp);

  const { access_token, refresh_token, expires_in } = tokenResp;

  // if DATABASE_URL is set, persist refresh_token and set a server-side user cookie
  try {
    if (process.env.DATABASE_URL) {
      await ensureSchema();
      // fetch spotify profile to get spotify user id
      const profile = await getSpotifyProfile(access_token);
      const spotifyId = profile && profile.id;
      if (spotifyId) {
        // upsert into users table
        await pool.query(
          `INSERT INTO users (spotify_id, refresh_token, updated_at)
           VALUES ($1, $2, now())
           ON CONFLICT (spotify_id) DO UPDATE SET refresh_token = $2, updated_at = now()`,
          [spotifyId, refresh_token]
        );

        // set httpOnly cookie containing spotify id as the server-side session key
        res.setHeader('Set-Cookie', [
          cookie.serialize('user_id', spotifyId, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
        ]);
      }
    } else {
      // fallback: set access_token cookie so local dev works
      res.setHeader('Set-Cookie', [
        cookie.serialize('access_token', access_token, { httpOnly: false, path: '/', maxAge: expires_in }),
        cookie.serialize('refresh_token', refresh_token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
      ]);
    }
  } catch (e) {
    console.error('Error storing refresh token', e);
  }

  res.redirect('/');
}
