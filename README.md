# KeyFinder (scaffold)

Minimal Next.js TypeScript scaffold for KeyFinder — a small app to show Spotify playlist tracks and audio-features (keys).

Setup

1. Copy `.env.example` to `.env.local` and fill in `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REDIRECT_URI` (e.g. `http://localhost:3000/api/auth/callback`).
2. Install dependencies and run dev:

```powershell
cd C:\Users\richa\develop\keyfinder
npm install
npm run dev
```

3. Visit `http://localhost:3000` and click "Log in with Spotify" to authorize.

Notes
- This scaffold stores tokens in cookies for simplicity. For production, store refresh tokens securely in a database and use server-side sessions.
- I recommend deploying backend/API to Railway (with Postgres). Railway gives you an HTTPS URL you can use as the Spotify Redirect URI so you won't need tunneling.

Railway deployment (quick guide)

1. Push this repo to GitHub.
2. Create a new project on Railway and connect the GitHub repo (or use Railway's `Deploy from GitHub` flow).
3. Add a Postgres plugin in Railway (click + > Postgres). Copy the `DATABASE_URL` from Railway and add it to the Railway project's Environment Variables.
4. In Railway project environment variables, add these values from your Spotify app:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `SPOTIFY_REDIRECT_URI` — set this to `https://<your-railway-subdomain>/api/auth/callback` (use the Railway-generated domain)
5. Deploy. Railway will build the Docker image (or use the Node build) and give you a public HTTPS URL.
6. In the Spotify Dashboard, add the Railway HTTPS redirect URI exactly and save.

Notes:
- The app will store refresh tokens in Postgres when `DATABASE_URL` is present and will refresh access tokens server-side.
- After deployment, open the Railway public URL and click "Log in with Spotify" to authorize.
