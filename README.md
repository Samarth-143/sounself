# SoundSelf — Spotify Personality Analyzer

Turns your Spotify listening into a **listening archetype** and a **screenshot-worthy share card**. Reads your top tracks, artists, and audio DNA, scores a personality vector, maps it to one of ten archetypes, and renders a 1200×675 card you can export as a retina PNG — complete with a genre/artist donut, 5-bar mood spectrum, 24-hour listening clock, and full-track in-app playback.

Built with **React + Vite + Tailwind CSS + Framer Motion**. Runs fully on **mock data** with zero credentials, so the UI is always reviewable.

---

## Quick start

```bash
npm install
npm run dev
# open http://127.0.0.1:5173
```

With no credentials, the app boots in **demo mode** using realistic mock data. Use the **Shuffle** button on the result screen to cycle through all ten archetypes.

## Enabling the real Spotify flow

The app uses the **Authorization Code + PKCE** flow (no client secret — safe for a SPA).

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add a Redirect URI that **exactly** matches where you run the app, e.g. `http://127.0.0.1:5173/` (Spotify requires `127.0.0.1`, not `localhost`, for loopback).
3. Copy the env file and fill in your Client ID:
    ```bash
    cp .env.example .env.local
    ```
    ```env
    VITE_SPOTIFY_CLIENT_ID=your_client_id_here
    VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/
    ```
4. Restart `npm run dev` and visit the same `127.0.0.1` origin you registered.

> If `VITE_SPOTIFY_CLIENT_ID` is blank, the app stays in demo mode automatically.

Scopes requested: `user-top-read`, `user-read-recently-played`, `user-read-playback-state`, `user-modify-playback-state`, `streaming`, `user-read-email`, `user-read-private`, `playlist-read-private`. The `streaming` + playback scopes power full-track playback via the Web Playback SDK (Premium accounts).

### Heads-up: Spotify's Nov 2024 API restriction

Apps **created after Nov 2024** no longer receive `/audio-features` (returns `403`) or artist `genres` (returns `[]`). SoundSelf detects this and degrades gracefully instead of breaking:

- **Genre DNA → Artist DNA**: when genres are empty, the donut shows your real top artists instead (the card label switches to "Artist DNA").
- **Estimated audio profile**: when audio features are 403, the mood spectrum + archetype are derived deterministically from the metadata Spotify *does* still return (popularity, release era, explicitness, duration, artist mix). The card marks this with a small `EST.` badge.

To get the *real* audio-feature analysis you'd need a Spotify app that predates the restriction. **Demo mode** (no credentials) always shows the full, un-degraded experience.

---

## Features

- **PKCE OAuth** — Spotify Authorization Code flow (no client secret), token persistence + silent refresh in `localStorage`
- **Demo mode** — zero-credential launch with realistic mock data; shuffle through all 10 archetypes with one click
- **10 Archetypes** — The Wanderer, The Ritualist, The Hedonist, The Introspect, The Architect, The Anarchist, The Romantic, The Zeitgeist, The Ghost, The Catalyst — each with a full color palette that recolors the entire card
- **Genre / Artist DNA donut** — custom SVG ring chart; auto-switches to Artist DNA when Spotify returns empty genres (post-Nov 2024 apps)
- **Mood spectrum** — 5 animated dimensions: Acoustic / Electric / Kinetic / Cerebral / Raw
- **Listening clock** — radial 24-hour chart built from `played_at` timestamps
- **Top tracks playback** — full-track in-app player via Spotify Web Playback SDK; preview-embed fallback for non-Premium accounts
- **Now-playing bar** — live album art, elapsed/total time, click-to-seek progress
- **Time-range toggle** — 4 Weeks / 6 Months / All Time
- **Share export** — html2canvas retina PNG (2× scale), watermark-on-capture, download / clipboard copy / native Web Share
- **Graceful degradation** — deterministic audio-feature estimator (`estimate.js`) when Spotify 403s `/audio-features`; marked with `EST.` badge on the card
- **Persona generation** — deterministic alter-ego name + archetype-specific quote (`persona.js`)
- **Dark-first UI** — grain-overlay atmosphere, Clash Display / Syne + IBM Plex Mono typography, fully responsive card scaler

---

## How it works

```
src/
├── main.jsx                    # React entry point
├── index.css                   # Global styles, grain overlay, scrollbar
├── App.jsx                     # Screen orchestration + OAuth callback
├── components/
│   ├── Landing.jsx             # Hero + Connect / Demo CTA
│   ├── Loading.jsx             # Vinyl spinner with live status narration
│   ├── Result.jsx              # Frame, time-range toggle, responsive card scaler
│   ├── Card.jsx                # 1200×675 shareable card (forwardRef for capture)
│   ├── Share.jsx               # html2canvas → PNG: download / copy / Web Share
│   ├── DonutChart.jsx          # Custom SVG donut + legend (Genre or Artist DNA)
│   ├── MoodSpectrum.jsx        # Animated 5-dimension mood bars
│   ├── ListeningClock.jsx      # Radial 24-hour play-distribution chart
│   ├── TopTracks.jsx           # Playable top-tracks list + SDK preview fallback
│   ├── NowPlaying.jsx          # SDK playback bar (cover, progress, seek)
│   └── icons.jsx               # Inline SVG icon set (no external icon dependency)
├── hooks/
│   └── useSpotifyPlayer.js     # Lazy-loads & manages Spotify Web Playback SDK
└── lib/
    ├── spotifyApi.js           # PKCE auth, token refresh, fetch + mock fallback
    ├── algorithm.js            # Pure analysis: metrics → archetype + mood + stats
    ├── persona.js              # Procedural alter-ego name + quote (deterministic)
    ├── archetypes.js           # Archetype catalogue + per-archetype color palettes
    ├── estimate.js             # Metadata-based audio-feature estimator (403 fallback)
    └── mockData.js             # 10 archetype-biased mock profiles
```

### The algorithm (`algorithm.js`)
A **pure function** — same data in, same archetype out. It computes a normalized feature vector:

- **Genre diversity** — Shannon entropy of genre tags (normalized to a fixed reference so "more genres, evenly spread" scores higher)
- **Audio features** — mean valence, energy, danceability, acousticness, instrumentalness, speechiness
- **Tempo variance** and normalized loudness
- **Recency overlap** — how much of your recent rotation is in your all-time top
- **Mainstreamness** — average track popularity

Classification is a **nearest-ideal** model: each archetype owns an ideal point in feature space with per-feature weights, and the closest (weighted Euclidean) wins. This makes every archetype reachable and the result explainable.

### Archetypes
The Wanderer · The Ritualist · The Hedonist · The Introspect · The Architect · The Anarchist · The Romantic · The Zeitgeist · The Ghost · The Catalyst — each with an emoji, descriptor, ironic shadow trait, spirit artist, and a full color palette that recolors the entire card.

### Share export
`html2canvas` captures the card node at `scale: 2` (retina) → 1200×675 PNG. A "MADE WITH ◐ SOUNDSELF" watermark is toggled on **only** during capture, so it appears in the export but not the live UI. Download works everywhere; Copy uses the Clipboard API; the native **Web Share** sheet appears when `navigator.canShare({ files })` is supported (mobile).


