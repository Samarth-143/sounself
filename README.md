# SoundSelf — Spotify Personality Analyzer

Turns your Spotify listening into a **listening archetype** and a **screenshot-worthy share card**. Reads your top tracks, artists, and audio DNA, scores a personality vector, maps it to one of ten archetypes, and renders a 1200×675 card you can export as a retina PNG.

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

## How it works

```
src/
├── lib/
│   ├── spotifyApi.js   # PKCE auth, token refresh, data fetch + mock fallback
│   ├── algorithm.js    # pure analysis: metrics -> archetype + mood + genre DNA
│   ├── persona.js      # procedural alter-ego name + quote (deterministic)
│   ├── mockData.js     # 10 archetype-biased mock profiles
│   └── archetypes.js   # archetype catalogue + per-archetype palettes
├── components/
│   ├── Landing.jsx     # hero + Connect/Demo CTA
│   ├── Loading.jsx     # vinyl spinner + live status narration
│   ├── Result.jsx      # frame, time-range toggle, responsive card scaler
│   ├── Card.jsx        # the 1200×675 shareable card (forwardRef for capture)
│   ├── Share.jsx       # html2canvas -> PNG: download / copy / Web Share
│   ├── DonutChart.jsx  # custom SVG donut + radial pill labels
│   ├── MoodSpectrum.jsx# animated 5-dimension mood bars
│   └── icons.jsx       # inline SVG icons (no icon dependency)
└── App.jsx             # screen orchestration + OAuth callback handling
```

### The algorithm (`algorithm.js`)
A **pure function** — same data in, same archetype out. It computes a normalized
feature vector:

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

---

## Design direction

**Dark-first, grain-overlay atmosphere with a Clash Display / IBM Plex Mono pairing** — chosen to feel like a cinematic record sleeve rather than generic AI gradient slop, with each archetype driving its own moody palette so every card looks distinct and screenshot-ready.

---

## What I'd improve with more time

- **Code-split `html2canvas`** (it dominates the ~497 kB bundle); lazy-load it only when an export is triggered.
- Replace `html2canvas` with `satori`/`@vercel/og`-style server rendering for pixel-perfect fonts and guaranteed gradient fidelity.
- Real **token persistence + silent refresh** UX (currently refreshes on demand; a proactive timer would be smoother).
- **Audio-features fallback**: Spotify has restricted `/audio-features` for newer apps — add a heuristic estimator from artist genres when the endpoint 403s.
- Unit tests around `algorithm.js` and `persona.js` (the verification was run as a one-off script).
- A square **1080×1080** export variant for Instagram (the `Card` already accepts a `format` prop; just needs a UI toggle).
- Accessibility pass: focus rings, reduced-motion variants, and ARIA on the controls.
```
