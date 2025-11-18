import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { getAccessTokenForUser, getClientCredentialsToken } from '../../../../../lib/spotify';

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
  let authSource: 'db' | 'cookie' | null = null;
  if (userId) {
    token = await getAccessTokenForUser(userId);
    if (token) authSource = 'db';
  }
  if (!token && localAccess) {
    token = localAccess;
    authSource = 'cookie';
  }
  if (!token) return res.status(401).json({ error: 'not_authenticated' });

  const tracksUrl = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`;
  const tracksHttpResp = await fetch(tracksUrl, { headers: { Authorization: `Bearer ${token}` } });
  const tracksStatus = tracksHttpResp.status;
  
  if (!tracksHttpResp.ok) {
    const errorBody = await tracksHttpResp.text();
    return res.status(tracksStatus).json({ 
      error: 'spotify_tracks_error', 
      status: tracksStatus, 
      message: errorBody,
      authSource 
    });
  }
  
  const tracksResp = await tracksHttpResp.json();
  const items = tracksResp.items || [];

  const ids = items.map((it: any) => it.track && it.track.id).filter(Boolean).slice(0, 100);
  let features: any = {};
  let featsResp: any = null;
  let fallbackTried = false;
  let fallbackStatus: number | null = null;
  if (ids.length) {
    try {
      const resp = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids.join(',')}`, { headers: { Authorization: `Bearer ${token}` } });
      const status = resp.status;
      let body: any = null;
      try {
        body = await resp.json();
      } catch (e) {
        try { body = await resp.text(); } catch (e2) { body = null; }
      }

      featsResp = body;
      if (body && body.audio_features) {
        body.audio_features.forEach((f: any) => { if (f) features[f.id] = f; });
      }

      if (debug) {
        // include spotify response details in the debug output further down
        (featsResp as any).__status = status;
        (featsResp as any).__bodySample = typeof body === 'object' ? (body.audio_features ? `audio_features:${body.audio_features.length}` : Object.keys(body).slice(0,5)) : String(body).slice(0,200);
      }

      // Fallback with client-credentials if user-token call failed
      if (status >= 400) {
        const ccToken = await getClientCredentialsToken();
        if (ccToken) {
          fallbackTried = true;
          const resp2 = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids.join(',')}`, { headers: { Authorization: `Bearer ${ccToken}` } });
          fallbackStatus = resp2.status;
          let body2: any = null; try { body2 = await resp2.json(); } catch { try { body2 = await resp2.text(); } catch {} }
          if (body2 && body2.audio_features) {
            body2.audio_features.forEach((f: any) => { if (f) features[f.id] = f; });
          }
          if (debug) {
            (featsResp as any).__fallbackStatus = fallbackStatus;
            (featsResp as any).__fallbackBodySample = typeof body2 === 'object' ? (body2.audio_features ? `audio_features:${body2.audio_features.length}` : Object.keys(body2).slice(0,5)) : String(body2).slice(0,200);
          } else if (fallbackStatus && fallbackStatus >= 400) {
            return res.status(status).json({ error: 'spotify_error', status, body });
          }
        } else if (!debug) {
          return res.status(status).json({ error: 'spotify_error', status, body });
        }
      }
    } catch (e: any) {
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
        authSource,
      },
      featsSample: safeFeats,
      featsRespStatus: (featsResp as any)?.__status ?? null,
      featsRespBodySample: (featsResp as any)?.__bodySample ?? null,
      fallbackTried,
      fallbackStatus,
      tracksSample: items.slice(0, 6).map((it: any) => ({ id: it.track?.id ?? null, name: it.track?.name ?? null })),
      items: withFeatures,
    });
  }

  res.status(200).json({ items: withFeatures });
}
