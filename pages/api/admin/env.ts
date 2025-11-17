import type { NextApiRequest, NextApiResponse } from 'next';

function getProto(req: NextApiRequest) {
  const xf = req.headers['x-forwarded-proto'];
  if (typeof xf === 'string') return xf.split(',')[0];
  if (Array.isArray(xf) && xf.length) return xf[0];
  // fallback: assume https in hosted envs, http for localhost
  const host = req.headers.host || '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return 'http';
  return 'https';
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const vars = {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',
    SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI || '',
    DATABASE_URL: process.env.DATABASE_URL || ''
  };

  const missing: string[] = [];
  if (!vars.SPOTIFY_CLIENT_ID) missing.push('SPOTIFY_CLIENT_ID');
  if (!vars.SPOTIFY_CLIENT_SECRET) missing.push('SPOTIFY_CLIENT_SECRET');
  if (!vars.SPOTIFY_REDIRECT_URI) missing.push('SPOTIFY_REDIRECT_URI');

  // Build a recommended redirect URI based on the incoming request
  const proto = getProto(req);
  const host = req.headers.host || 'example.com';
  const expectedRedirect = `${proto}://${host}/api/auth/callback`;

  const redirectMatches = vars.SPOTIFY_REDIRECT_URI === expectedRedirect;

  res.status(200).json({
    missing,
    varsPresent: Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, Boolean(v)])),
    expectedRedirect,
    redirectMatches,
    notes: {
      spotifyDashboard: 'https://developer.spotify.com/dashboard/applications',
      help: 'Add the missing environment variables in your Railway project settings (Environment). Use the exact redirect URI shown in `expectedRedirect`.'
    }
  });
}
