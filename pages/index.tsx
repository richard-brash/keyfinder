import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [playlists, setPlaylists] = useState<any[] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get('/api/spotify/playlists');
        setPlaylists(res.data.items || []);
      } catch (err) {
        // not logged in or other error
      }
    }

    load();
  }, []);

  return (
    <main className="container">
      <h1>KeyFinder</h1>
      {!playlists && (
        <a className="btn" href="/api/auth/login">
          Log in with Spotify
        </a>
      )}

      {playlists && (
        <div>
          <h2>Your Playlists</h2>
          <ul>
            {playlists.map((p: any) => (
              <li key={p.id}>
                <a href={`/playlist/${p.id}`}>{p.name}</a> — {p.tracks.total} tracks
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
