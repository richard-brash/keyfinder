# KeyFinder Setup Guide

Your app now shows musical keys for every song in your Spotify playlists using AcousticBrainz!

## How It Works

1. **Browse Playlists**: See all your Spotify playlists
2. **View Songs**: Click a playlist to see all tracks
3. **See Keys**: Each song displays its musical key (e.g., "C major", "A minor")
   - If Spotify audio features are available, uses those (fast)
   - Otherwise, looks up the key via AcousticBrainz + MusicBrainz (cached forever)

## Quick Start (After Railway Deployment)

### Step 1: Find Your Railway URL
Your app is deployed at: `https://keyfinder-production-XXXX.up.railway.app`
(Check your Railway dashboard for the exact URL)

### Step 2: Initialize the Database
Visit this URL once to create the keys cache table:
```
https://your-app.up.railway.app/api/admin/init-keys-db
```
Expected response: `{"ok":true,"table":"keys_cache"}`

### Step 3: Log In with Spotify
1. Go to your app homepage
2. Click "Log in with Spotify"
3. Authorize the app

### Step 4: Browse Your Playlists
1. Click any playlist
2. See all songs with their keys!
3. Keys will load progressively (showing "(acousticbrainz)" when using the fallback)

## What You'll See

For each track:
- **Key**: The musical key (C, D, E, F, G, A, B with major/minor)
- **Tempo**: Beats per minute (if available)
- **Time Signature**: 3/4, 4/4, etc. (if available)
- **Danceability & Energy**: 0-1 scale (if available)

## Troubleshooting

### "not_authenticated" error
- Make sure you've logged in with Spotify
- Your session cookie should persist for 30 days

### Keys showing as "—"
- The track might not be in MusicBrainz/AcousticBrainz databases yet
- Obscure or very new tracks may not have key data available
- Check the browser console for any errors

### Database errors
- Make sure you ran the init-keys-db endpoint
- Verify DATABASE_URL is set in Railway environment variables

## Admin Endpoints

Useful for debugging:
- `/api/admin/env` - Check environment variables
- `/api/admin/debug` - System info
- `/api/admin/init-db` - Create users table
- `/api/admin/init-keys-db` - Create keys cache table
- `/api/keys/TRACK_ID` - Get key for a specific track

## Architecture

- **Frontend**: Next.js pages with React
- **Auth**: Spotify OAuth (refresh tokens in Postgres)
- **Key Detection**: 
  1. Try Spotify audio-features (blocked for new apps)
  2. Fallback to AcousticBrainz via MusicBrainz search
  3. Cache results in Postgres forever
- **Hosting**: Railway with Postgres database

Enjoy discovering the keys in your music! 🎵
