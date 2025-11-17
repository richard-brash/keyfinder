import { useEffect, useState } from 'react';
import axios from 'axios';
import { keyToPitch } from '../../lib/spotify';
import { useRouter } from 'next/router';

export default function PlaylistPage() {
  const router = useRouter();
  const { id } = router.query;
  const [tracks, setTracks] = useState<any[] | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await axios.get(`/api/spotify/playlists/${id}/tracks`);
      setTracks(res.data.items || []);
    }

    load();
  }, [id]);

  return (
    <main className="container">
      <h1>Playlist</h1>
      {!tracks && <p>Loading...</p>}
      {tracks && (
        <ul>
          {tracks.map((t: any) => (
            <li key={t.track?.id || Math.random()}>
              <div style={{ marginBottom: 6 }}>
                <strong>{t.track?.name || 'Unknown track'}</strong> — {t.track?.artists?.map((a: any) => a.name).join(', ')}
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
    </main>
  );
}
