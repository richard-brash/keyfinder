import { useEffect, useState } from 'react';
import axios from 'axios';
import { keyToPitch } from '../../lib/music';
import { useRouter } from 'next/router';

export default function PlaylistPage() {
  const router = useRouter();
  const { id } = router.query;
  const [tracks, setTracks] = useState<any[] | null>(null);
  const [hasAnyFeatures, setHasAnyFeatures] = useState<boolean | null>(null);
  const [showIds, setShowIds] = useState<boolean>(false);
  const [debugData, setDebugData] = useState<any | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await axios.get(`/api/spotify/playlists/${id}/tracks`);
      const items = res.data.items || [];
      setTracks(items);
      setHasAnyFeatures(items.some((it: any) => it.audio_features));
    }

    load();
  }, [id]);

  return (
    <main className="container">
      <h1>Playlist</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>← Back to library</button>
        <label style={{ fontSize: 14 }}>
          <input type="checkbox" checked={showIds} onChange={e => setShowIds(e.target.checked)} style={{ marginRight: 6 }} />
          Show track IDs
        </label>
        <button
          onClick={async () => {
            if (!id) return;
            setDebugLoading(true);
            try {
              const r = await axios.get(`/api/spotify/playlists/${id}/tracks?debug=1`);
              setDebugData(r.data);
            } catch (e: any) {
              setDebugData({ error: true, message: e?.response?.data || String(e) });
            } finally {
              setDebugLoading(false);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          {debugLoading ? 'Loading debug...' : 'Fetch debug info'}
        </button>
      </div>
      {!tracks && <p>Loading...</p>}
      {tracks && hasAnyFeatures === false && (
        <p style={{ fontSize: 13, color: '#666' }}>
          Audio features are not available for these tracks (they may be local files or unindexed by Spotify).
        </p>
      )}
      {tracks && (
        <ul>
          {tracks.map((t: any) => (
            <li key={t.track?.id || Math.random()}>
              <div style={{ marginBottom: 6 }}>
                <strong>{t.track?.name || 'Unknown track'}</strong> — {t.track?.artists?.map((a: any) => a.name).join(', ')}
                {showIds && (
                  <div style={{ fontSize: 12, color: '#666' }}>ID: {t.track?.id ?? '—'}</div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#444' }}>
                <span>Key: {t.audio_features ? keyToPitch(t.audio_features.key, t.audio_features.mode) : '—'}</span>
                <span style={{ marginLeft: 12 }}>Tempo: {t.audio_features ? Math.round(t.audio_features.tempo) : '—'}</span>
                <span style={{ marginLeft: 12 }}>Time Sig: {t.audio_features ? t.audio_features.time_signature : '—'}</span>
                <span style={{ marginLeft: 12 }}>Danceability: {t.audio_features ? t.audio_features.danceability.toFixed(2) : '—'}</span>
                <span style={{ marginLeft: 12 }}>Energy: {t.audio_features ? t.audio_features.energy.toFixed(2) : '—'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {debugData && (
        <section style={{ marginTop: 20, background: '#f7f7f8', padding: 12, borderRadius: 6 }}>
          <h3 style={{ marginTop: 0 }}>Debug response</h3>
          <pre style={{ maxHeight: 320, overflow: 'auto', fontSize: 12 }}>{JSON.stringify(debugData, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
