import { useEffect, useState } from 'react';
import axios from 'axios';

type EnvStatus = {
  missing: string[];
  expectedRedirect: string;
  redirectMatches: boolean;
  varsPresent: Record<string, boolean>;
};

export default function Home() {
  const [playlists, setPlaylists] = useState<any[] | null>(null);
  const [env, setEnv] = useState<EnvStatus | null>(null);

  useEffect(() => {
    async function loadPlaylists() {
      try {
        const res = await axios.get('/api/spotify/playlists');
        setPlaylists(res.data.items || []);
      } catch (err) {
        // not logged in or other error
      }
    }

    async function checkEnv() {
      try {
        const r = await axios.get('/api/admin/env');
        setEnv(r.data);
      } catch (e) {
        // ignore
      }
    }

    checkEnv();
    loadPlaylists();
  }, []);

  const missingCritical = env && (env.missing.includes('SPOTIFY_CLIENT_ID') || env.missing.includes('SPOTIFY_CLIENT_SECRET') || env.missing.includes('SPOTIFY_REDIRECT_URI'));

  return (
    <main className="container">
      <h1>KeyFinder</h1>

      {env && env.missing.length > 0 && (
        <section style={{ border: '1px solid #e33', padding: 12, marginBottom: 16, background: '#fff6f6' }}>
          <h2 style={{ marginTop: 0 }}>Setup required</h2>
          <p>
            The app is missing environment variables required for Spotify login. You can add them in your Railway project (Environment variables).
          </p>
          <p><strong>Required vars:</strong> {env.missing.join(', ')}</p>

          <p>
            <strong>Redirect URI to add to your Spotify App settings:</strong>
          </p>
          <pre style={{ background: '#f4f4f4', padding: 8 }}>{env.expectedRedirect}</pre>

          <p>Copy these lines into your Railway environment (replace placeholder values):</p>
          <pre style={{ background: '#f4f4f4', padding: 8 }}>
{`SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=${env.expectedRedirect}
DATABASE_URL=postgres://...`}
          </pre>

          {!env.redirectMatches && (
            <p style={{ color: '#b33' }}>Note: the current SPOTIFY_REDIRECT_URI does not match the expected value above. Use the exact value shown when registering the redirect in the Spotify Dashboard.</p>
          )}

          <p>
            Spotify dashboard: <a href="https://developer.spotify.com/dashboard/applications" target="_blank" rel="noreferrer">developer.spotify.com/dashboard/applications</a>
          </p>
        </section>
      )}

      {!missingCritical && !playlists && (
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
