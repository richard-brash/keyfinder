import type { NextApiRequest, NextApiResponse } from 'next';

function maskValue(v: string | undefined) {
  if (v === undefined) return { present: false };
  const len = v.length;
  if (len === 0) return { present: true, length: 0, masked: '' };
  // show only first/last 3 chars to avoid leaking secrets
  if (len <= 6) return { present: true, length: len, masked: '***' };
  return { present: true, length: len, masked: `${v.slice(0,3)}...${v.slice(-3)}` };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // whitelist env keys to report on
  const keys = [
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
    'SPOTIFY_REDIRECT_URI',
    'DATABASE_URL',
    'NODE_ENV'
  ];

  const env: Record<string, any> = {};
  keys.forEach((k) => {
    env[k] = maskValue(process.env[k]);
  });

  const info = {
    nodeVersion: process.version,
    cwd: process.cwd(),
    pid: process.pid,
    env
  };

  res.status(200).json(info);
}
