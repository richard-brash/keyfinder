import { useEffect, useState } from 'react';
import axios from 'axios';
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
            <li key={t.track.id}>
              {t.track.name} — {t.track.artists.map((a: any) => a.name).join(', ')} —
              Key: {t.audio_features ? `${t.audio_features.key}/${t.audio_features.mode}` : '—'}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
