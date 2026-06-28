// estimate.js
// Spotify withholds /audio-features (403) and artist genres ([]) from apps
// created after its Nov 2024 restriction. When that happens we derive a
// deterministic, plausible feature set from the metadata we CAN still read:
// popularity, release era, explicitness, duration and artist mix.
//
// These are heuristic ESTIMATES, not Spotify's real audio analysis — but they
// are pure (same data -> same output) so the archetype stays stable.

const clamp01 = (n) => Math.max(0, Math.min(1, n))
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

function hashStr(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function parseYear(date) {
  if (!date) return null
  const y = parseInt(String(date).slice(0, 4), 10)
  return Number.isFinite(y) ? y : null
}

export function hasRealGenres(topArtists = []) {
  return topArtists.some((a) => (a.genres?.length || 0) > 0)
}

export function audioFeaturesMissing(audioFeatures = {}, topTracks = []) {
  if (!topTracks.length) return false
  return Object.keys(audioFeatures).length === 0
}

// Deterministic per-track estimate.
export function estimateAudioFeatures(data) {
  const { topTracks = [] } = data
  const thisYear = new Date().getFullYear()
  const years = topTracks.map((t) => parseYear(t.releaseDate)).filter(Boolean)
  const yearMean = years.length ? mean(years) : thisYear - 5

  const af = {}
  for (const t of topTracks) {
    const seed = hashStr(`${t.id}|${t.artists?.[0]?.name || ''}`)
    const jit = (shift) => (((seed >>> shift) % 1000) / 1000 - 0.5) * 0.18 // ±0.09 stable jitter

    const pop = (t.popularity ?? 50) / 100
    const year = parseYear(t.releaseDate) || yearMean
    const recency = clamp01((year - 1990) / (thisYear - 1990)) // 0=old, 1=new
    const explicit = t.explicit ? 1 : 0
    const durMin = (t.durationMs ?? 210000) / 60000

    const energy = clamp01(0.42 + 0.22 * explicit + 0.22 * (recency - 0.5) * 2 + 0.12 * pop + jit(3))
    const danceability = clamp01(0.46 + 0.22 * pop + 0.16 * explicit + 0.12 * (recency - 0.5) * 2 + jit(7))
    const valence = clamp01(0.4 + 0.24 * pop + 0.18 * (recency - 0.5) * 2 - 0.14 * explicit + jit(11))
    const acousticness = clamp01(0.62 - 0.42 * energy + 0.22 * (1 - recency) + jit(13))
    const instrumentalness = clamp01(0.16 + 0.34 * (1 - pop) - 0.12 * explicit + 0.12 * (durMin > 5 ? 0.3 : 0) + jit(17))
    const speechiness = clamp01(0.05 + 0.28 * explicit + jit(19) * 0.4)
    const tempo = 88 + 64 * energy + ((seed >>> 23) % 24) - 12
    const loudness = -16 + 12 * energy

    af[t.id] = { id: t.id, energy, danceability, valence, acousticness, instrumentalness, speechiness, tempo, loudness }
  }
  return af
}
