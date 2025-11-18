import { pool, dbAvailable } from './db';

type KeyResult = {
  key: number; // 0-11
  mode: 0 | 1; // 0 minor, 1 major
  confidence?: number;
  source: 'acousticbrainz';
  mbid?: string;
  title?: string;
  artist?: string;
};

const PITCH_MAP: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

function parseKeyPair(keyStr: string, scaleStr: string): { key: number; mode: 0 | 1 } | null {
  const k = (keyStr || '').trim();
  const s = (scaleStr || '').trim().toLowerCase();
  const up = k.toUpperCase().replace('M', '#');
  const num = PITCH_MAP[up];
  if (num === undefined) return null;
  const mode: 0 | 1 = s.includes('minor') ? 0 : 1;
  return { key: num, mode };
}

async function searchMusicBrainz(title: string, artist: string, durationMs?: number): Promise<string | null> {
  // Simple MB recording search. Respect basic etiquette with a UA string.
  const q = `recording:"${title}" AND artist:"${artist}"`;
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(q)}&fmt=json&limit=5`;
  const resp = await fetch(url, { headers: { 'User-Agent': 'keyfinder/0.1 (contact: example@example.com)' } });
  if (!resp.ok) return null;
  const json: any = await resp.json();
  const recs: any[] = json.recordings || [];
  if (!recs.length) return null;
  // Rank by score, then by duration closeness if provided.
  let best = recs[0];
  if (durationMs) {
    let bestScore = Number(best.score || 0);
    let bestDelta = best.length ? Math.abs(Number(best.length) - durationMs) : Number.MAX_SAFE_INTEGER;
    for (const r of recs) {
      const sc = Number(r.score || 0);
      const delta = r.length ? Math.abs(Number(r.length) - durationMs) : Number.MAX_SAFE_INTEGER;
      if (sc > bestScore || (sc === bestScore && delta < bestDelta)) { best = r; bestScore = sc; bestDelta = delta; }
    }
  }
  const id = best.id as string | undefined;
  return id || null;
}

async function fetchAcousticBrainzHighLevel(mbid: string): Promise<{ key: number; mode: 0|1; confidence?: number } | null> {
  const url = `https://acousticbrainz.org/api/v1/${encodeURIComponent(mbid)}/high-level`;
  const resp = await fetch(url, { headers: { 'User-Agent': 'keyfinder/0.1 (contact: example@example.com)' } });
  if (!resp.ok) return null;
  const json: any = await resp.json();
  const tonal = json?.highlevel?.tonal || json?.tonal || json?.highlevel || {};
  const keyStr = tonal?.key_key?.value || tonal?.key_key || tonal?.chords_key || tonal?.key;
  const scaleStr = tonal?.key_scale?.value || tonal?.key_scale || tonal?.chords_scale || tonal?.scale || 'major';
  const conf = Number(tonal?.key_key?.probability || tonal?.key_scale?.probability || tonal?.key_strength || tonal?.strength || 0.0);
  const parsed = parseKeyPair(String(keyStr || ''), String(scaleStr || ''));
  if (!parsed) return null;
  return { key: parsed.key, mode: parsed.mode, confidence: isFinite(conf) ? conf : undefined };
}

export async function getKeyForTrack(trackId: string, accessToken: string | null): Promise<KeyResult | null> {
  if (!dbAvailable || !pool) return null;
  // Check cache first
  try {
    const r = await pool.query('SELECT key, mode, confidence, source, mbid, title, artist FROM keys_cache WHERE track_id = $1', [trackId]);
    if (r.rows && r.rows.length) {
      const row = r.rows[0];
      return { key: row.key, mode: row.mode, confidence: row.confidence ?? undefined, source: row.source, mbid: row.mbid ?? undefined, title: row.title ?? undefined, artist: row.artist ?? undefined } as KeyResult;
    }
  } catch {}

  if (!accessToken) return null;

  // Fetch track metadata from Spotify to get title/artist/duration
  let title = '';
  let artist = '';
  let durationMs: number | undefined = undefined;
  try {
    const tResp = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (tResp.ok) {
      const t = await tResp.json();
      title = t?.name || '';
      artist = (t?.artists?.[0]?.name) || '';
      durationMs = Number(t?.duration_ms || 0) || undefined;
    }
  } catch {}
  if (!title || !artist) return null;

  // Resolve via MusicBrainz + AcousticBrainz
  try {
    const mbid = await searchMusicBrainz(title, artist, durationMs);
    if (!mbid) return null;
    const info = await fetchAcousticBrainzHighLevel(mbid);
    if (!info) return null;
    // Cache result
    try {
      await pool.query(
        `INSERT INTO keys_cache(track_id, source, key, mode, confidence, mbid, title, artist, updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8, now())
         ON CONFLICT (track_id) DO UPDATE SET source=EXCLUDED.source, key=EXCLUDED.key, mode=EXCLUDED.mode, confidence=EXCLUDED.confidence, mbid=EXCLUDED.mbid, title=EXCLUDED.title, artist=EXCLUDED.artist, updated_at=now()`,
        [trackId, 'acousticbrainz', info.key, info.mode, info.confidence ?? null, mbid, title, artist]
      );
    } catch {}
    return { key: info.key, mode: info.mode, confidence: info.confidence, source: 'acousticbrainz', mbid, title, artist };
  } catch {
    return null;
  }
}
