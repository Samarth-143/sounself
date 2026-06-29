// mockData.js
// Generates realistic Spotify-shaped data so the UI is always reviewable
// without credentials. Each profile biases audio features / popularity /
// genre spread so it resolves to a specific archetype — meaning all 10
// archetypes are reachable by switching the mock profile.

const GENRE_POOL = [
  'indie rock', 'art pop', 'ambient', 'techno', 'hyperpop', 'neo-soul',
  'folk', 'jazz fusion', 'shoegaze', 'drum and bass', 'bedroom pop', 'post-rock',
  'synthwave', 'trap', 'classical crossover', 'dream pop', 'garage punk', 'lo-fi',
]

const ARTIST_NAMES = [
  'Halo Vesper', 'Mono Atlas', 'The Pale Hours', 'Cassette Ghost', 'Violet Index',
  'Nadir', 'Sable & Co', 'Echo Meridian', 'Glass Animals II', 'Northwind',
  'Lumen', 'Tidal Saints', 'Concrete Bloom', 'Velvet Static', 'Aurora Decay',
  'Slow Comet', 'Iron Lullaby', 'Neon Carcass', 'Paper Cathedral', 'Dust Choir',
]

const TRACK_TITLES = [
  'Ultraviolet', 'Slow Burn', 'Telegraph', 'Marble Skies', 'Static Bloom',
  'Honeyglass', 'Riot Lullaby', 'Cathode', 'Salt & Smoke', 'Paper Moon',
  'Midnight Index', 'Glass Engine', 'Velvet Ruins', 'Comet Tail', 'Fever Map',
  'Hollow Light', 'Neon Requiem', 'Driftwood', 'Pulsewidth', 'Afterglow',
  'Iron Sun', 'Quiet Riot', 'Tidal', 'Concrete Heart', 'Aurora',
]

/* ------------------------------ profiles -------------------------------- */
// f = audio-feature target means; pop = popularity range; div = genre spread;
// overlap = recency/top overlap (0..1).

const PROFILES = {
  wanderer:   { f: { valence: 0.5, energy: 0.55, dance: 0.5, acoustic: 0.45, instr: 0.3, speech: 0.1, tempo: 120, tempoSpread: 25 }, pop: [5, 65], div: 'high', overlap: 0.4 },
  ritualist:  { f: { valence: 0.45, energy: 0.5, dance: 0.5, acoustic: 0.5, instr: 0.2, speech: 0.08, tempo: 110, tempoSpread: 8 }, pop: [25, 85], div: 'low', overlap: 0.85 },
  hedonist:   { f: { valence: 0.82, energy: 0.85, dance: 0.88, acoustic: 0.1, instr: 0.05, speech: 0.12, tempo: 124, tempoSpread: 8 }, pop: [45, 98], div: 'mid', overlap: 0.5 },
  introspect: { f: { valence: 0.3, energy: 0.25, dance: 0.35, acoustic: 0.8, instr: 0.2, speech: 0.06, tempo: 92, tempoSpread: 10 }, pop: [5, 55], div: 'mid', overlap: 0.5 },
  architect:  { f: { valence: 0.45, energy: 0.6, dance: 0.5, acoustic: 0.2, instr: 0.85, speech: 0.04, tempo: 128, tempoSpread: 45 }, pop: [15, 75], div: 'mid', overlap: 0.5 },
  anarchist:  { f: { valence: 0.2, energy: 0.92, dance: 0.5, acoustic: 0.08, instr: 0.25, speech: 0.2, tempo: 150, tempoSpread: 50 }, pop: [20, 80], div: 'mid', overlap: 0.45 },
  romantic:   { f: { valence: 0.85, energy: 0.4, dance: 0.45, acoustic: 0.78, instr: 0.1, speech: 0.05, tempo: 84, tempoSpread: 9 }, pop: [30, 90], div: 'mid', overlap: 0.55 },
  zeitgeist:  { f: { valence: 0.65, energy: 0.7, dance: 0.72, acoustic: 0.15, instr: 0.05, speech: 0.14, tempo: 118, tempoSpread: 12 }, pop: [55, 99], div: 'mid', overlap: 0.15 },
  ghost:      { f: { valence: 0.35, energy: 0.45, dance: 0.3, acoustic: 0.55, instr: 0.9, speech: 0.03, tempo: 100, tempoSpread: 14 }, pop: [3, 45], div: 'mid', overlap: 0.5 },
  catalyst:   { f: { valence: 0.5, energy: 0.5, dance: 0.5, acoustic: 0.5, instr: 0.5, speech: 0.1, tempo: 120, tempoSpread: 22 }, pop: [35, 85], div: 'high', overlap: 0.5 },
}

export const PROFILE_IDS = Object.keys(PROFILES)

// Per-archetype flavor for the metadata-only features (clock, era, explicit).
const PEAK_HOUR = {
  wanderer: 15, ritualist: 8, hedonist: 23, introspect: 1, architect: 14,
  anarchist: 22, romantic: 20, zeitgeist: 18, ghost: 2, catalyst: 17,
}
const ERA_CENTER = {
  wanderer: 2015, ritualist: 2019, hedonist: 2022, introspect: 2017, architect: 2010,
  anarchist: 2016, romantic: 2014, zeitgeist: 2024, ghost: 2012, catalyst: 2019,
}

/* --------------------------- prng + sampling ---------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp01 = (n) => Math.max(0, Math.min(1, n))

function buildGenres(div, rng) {
  // Returns a function (artistIndex) -> string[] of genres.
  if (div === 'high') {
    // even spread across the whole pool => high entropy
    return (i) => [GENRE_POOL[i % GENRE_POOL.length], GENRE_POOL[(i + 5) % GENRE_POOL.length]]
  }
  if (div === 'low') {
    // 80% of artists collapse onto 2 genres => low entropy
    const core = [GENRE_POOL[0], GENRE_POOL[1]]
    return (i) => (rng() < 0.85 ? [core[i % 2]] : [GENRE_POOL[2 + (i % 4)]])
  }
  // mid: a handful of genres
  const mid = GENRE_POOL.slice(0, 6)
  return (i) => [mid[i % mid.length]]
}

/* ------------------------------ generator ------------------------------- */

export function generateMockData({ profileId, timeRange = 'medium_term', seed } = {}) {
  const id = profileId && PROFILES[profileId] ? profileId : PROFILE_IDS[Math.floor(Math.random() * PROFILE_IDS.length)]
  const profile = PROFILES[id]
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 1e9))

  // gaussian-ish noise around a target mean
  const around = (target, spread = 0.12) => clamp01(target + (rng() - 0.5) * 2 * spread)

  const genresFor = buildGenres(profile.div, rng)
  const peakHour = PEAK_HOUR[id] ?? 18
  const eraCenter = ERA_CENTER[id] ?? 2018
  const explicitRate = clamp01(profile.f.speech * 1.6 + (profile.f.energy > 0.75 ? 0.2 : 0))

  const topArtists = Array.from({ length: 50 }, (_, i) => ({
    id: `art${i}`,
    name: ARTIST_NAMES[i % ARTIST_NAMES.length] + (i >= ARTIST_NAMES.length ? ` ${Math.floor(i / ARTIST_NAMES.length) + 1}` : ''),
    genres: genresFor(i),
    popularity: Math.round(profile.pop[0] + rng() * (profile.pop[1] - profile.pop[0])),
  }))

  const topTracks = Array.from({ length: 50 }, (_, i) => {
    const year = Math.round(eraCenter + (rng() - 0.5) * 10)
    const month = String(1 + Math.floor(rng() * 12)).padStart(2, '0')
    return {
      id: `trk${i}`,
      name: TRACK_TITLES[i % TRACK_TITLES.length] + (i >= TRACK_TITLES.length ? ` (Pt. ${Math.floor(i / TRACK_TITLES.length) + 1})` : ''),
      artists: [{ id: `art${i % 50}`, name: topArtists[i % 50].name }],
      popularity: Math.round(profile.pop[0] + rng() * (profile.pop[1] - profile.pop[0])),
      explicit: rng() < explicitRate,
      durationMs: Math.round((150 + rng() * 150) * 1000),
      releaseDate: `${Math.min(year, 2025)}-${month}-15`,
    }
  })

  const audioFeatures = {}
  topTracks.forEach((t) => {
    audioFeatures[t.id] = {
      valence: around(profile.f.valence),
      energy: around(profile.f.energy),
      danceability: around(profile.f.dance),
      acousticness: around(profile.f.acoustic),
      instrumentalness: around(profile.f.instr),
      speechiness: around(profile.f.speech, 0.05),
      tempo: profile.f.tempo + (rng() - 0.5) * 2 * profile.f.tempoSpread,
      loudness: -14 + (rng() - 0.5) * 16,
    }
  })

  // Recently played: mix of top tracks (overlap) and "new" tracks (churn),
  // each stamped with a played_at clustered around the profile's peak hour.
  const now = Date.now()
  const recentlyPlayed = Array.from({ length: 50 }, (_, i) => {
    const dayOffset = Math.floor(rng() * 14)
    // hour clustered around peakHour with wrap-around noise
    let hour = Math.round(peakHour + (rng() - 0.5) * 8)
    hour = ((hour % 24) + 24) % 24
    const d = new Date(now - dayOffset * 86400000)
    d.setHours(hour, Math.floor(rng() * 60), 0, 0)
    const playedAt = d.toISOString()

    if (rng() < profile.overlap) {
      const t = topTracks[Math.floor(rng() * topTracks.length)]
      return { id: t.id, name: t.name, artists: t.artists, playedAt }
    }
    return { id: `new${i}`, name: `Unheard ${i}`, artists: [{ id: 'x', name: 'New Artist' }], playedAt }
  })

  return {
    profileId: id,
    displayName: 'Demo Listener',
    timeRange,
    topTracks,
    topArtists,
    recentlyPlayed,
    audioFeatures,
  }
}
