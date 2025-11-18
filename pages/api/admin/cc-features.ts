import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const trackId = String(req.query.id || '');
  if (!trackId) return res.status(400).json({ error: 'missing_track_id', example: '/api/admin/cc-features?id=7cNRqg0lbiqBaGeOlA4AEU' });

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'missing_client_creds' });

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }).toString()
    });
    const tokenStatus = tokenResp.status;
    let tokenBody: any = null;
    try { tokenBody = await tokenResp.json(); } catch {}
    const ccToken = tokenBody && tokenBody.access_token;

    const out: any = { ok: true, tokenStatus, tokenHasAccessToken: Boolean(ccToken) };

    if (!ccToken) {
      return res.status(200).json({ ...out, tokenBody });
    }

    // Call audio-features (single and batch) using client-credentials token
    const authHeader = { Authorization: `Bearer ${ccToken}` };

    try {
      const featsResp = await fetch(`https://api.spotify.com/v1/audio-features/${encodeURIComponent(trackId)}`, { headers: authHeader });
      const status = featsResp.status;
      let body: any = null; try { body = await featsResp.json(); } catch { body = await featsResp.text(); }
      out.features = { status, body };
    } catch (e: any) {
      out.features = { error: String(e) };
    }

    try {
      const batchResp = await fetch(`https://api.spotify.com/v1/audio-features?ids=${encodeURIComponent(trackId)}`, { headers: authHeader });
      const status = batchResp.status;
      let body: any = null; try { body = await batchResp.json(); } catch { body = await batchResp.text(); }
      out.featuresBatch = { status, body };
    } catch (e: any) {
      out.featuresBatch = { error: String(e) };
    }

    // Also sanity check we can fetch the track metadata with cc token (should be allowed)
    try {
      const tr = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`, { headers: authHeader });
      const status = tr.status;
      let body: any = null; try { body = await tr.json(); } catch { body = await tr.text(); }
      out.track = { status, body };
    } catch (e: any) {
      out.track = { error: String(e) };
    }

    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(500).json({ error: 'cc_test_failed', message: String(e) });
  }
}
