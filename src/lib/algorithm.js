// algorithm.js
// Pure, deterministic analysis. Same input data -> same archetype + metrics.
// No randomness, no side effects.

import { ARCHETYPES } from './archetypes.js'
import { estimateAudioFeatures, audioFeaturesMissing, hasRealGenres } from './estimate.js'

/* ----------------------------- math helpers ----------------------------- */

const clamp01 = (n) => Math.max(0, Math.min(1, n))

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

const stddev = (arr) => {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)))
}

// Shannon entropy of a frequency map, normalized against a fixed reference
// (REF distinct genres) so that "more genres, evenly spread" => higher score.
// Normalizing by the number of *present* categories would make any even
// distribution score 1.0, erasing the distinction we actually want.
const ENTROPY_REF = 10
function shannonEntropy(counts) {
  const values = Object.values(counts)
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0 || values.length < 2) return 0
  let h = 0
  for (const c of values) {
    if (c <= 0) continue
    const p = c / total
    h -= p * Math.log2(p)
  }
  return clamp01(h / Math.log2(ENTROPY_REF))
}

/* --------------------------- feature extraction -------------------------- */

// Build a "DNA" frequency map. Prefer real artist genres; if Spotify withheld
// them (empty for apps under the Nov 2024 restriction) fall back to how your
// top *tracks* distribute across artists — a real listening-share signal.
function buildDnaCounts(topArtists, topTracks = []) {
  const genreCounts = {}
  topArtists.forEach((artist, idx) => {
    const weight = 1 + (topArtists.length - idx) / topArtists.length // ~2..1
    for (const g of artist.genres || []) {
      genreCounts[g] = (genreCounts[g] || 0) + weight
    }
  })

  if (Object.keys(genreCounts).length > 0) {
    return { counts: genreCounts, mode: 'genre' }
  }

  // Fallback: count how many of your top tracks each (primary) artist leads.
  // This gives a meaningful, varied share instead of near-equal rank weights.
  const artistCounts = {}
  for (const t of topTracks) {
    const name = t.artists?.[0]?.name
    if (name) artistCounts[name] = (artistCounts[name] || 0) + 1
  }
  if (Object.keys(artistCounts).length > 1) {
    return { counts: artistCounts, mode: 'artist' }
  }

  // Last resort: rank-weight the top artists list.
  const fallback = {}
  topArtists.forEach((artist, idx) => {
    const weight = 1 + (topArtists.length - idx) / topArtists.length
    if (artist.name) fallback[artist.name] = (fallback[artist.name] || 0) + weight
  })
  return { counts: fallback, mode: 'artist' }
}

export function topGenres(counts, n = 6) {
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
  // Normalize against the shown slices so the % labels sum to ~100 and match
  // the donut segment sizes (rather than being a tiny share of everything).
  const shownTotal = top.reduce((sum, [, v]) => sum + v, 0) || 1
  return top.map(([name, value]) => ({
    name,
    value,
    pct: Math.round((value / shownTotal) * 100),
  }))
}

// Average a single audio-feature dimension across a list of track ids.
function avgFeature(trackIds, features, key) {
  const vals = trackIds.map((id) => features[id]?.[key]).filter((v) => typeof v === 'number')
  return mean(vals)
}

/* ------------------------------ core metrics ----------------------------- */

export function computeMetrics(data) {
  const { topTracks = [], topArtists = [], recentlyPlayed = [], audioFeatures = {} } = data

  const topTrackIds = topTracks.map((t) => t.id)
  const recentIds = recentlyPlayed.map((t) => t.id)

  const { counts: genreCounts, mode: dnaMode } = buildDnaCounts(topArtists, topTracks)
  const diversity = shannonEntropy(genreCounts) // 0..1
  const valence = clamp01(avgFeature(topTrackIds, audioFeatures, 'valence'))
  const energy = clamp01(avgFeature(topTrackIds, audioFeatures, 'energy'))
  const danceability = clamp01(avgFeature(topTrackIds, audioFeatures, 'danceability'))
  const acousticness = clamp01(avgFeature(topTrackIds, audioFeatures, 'acousticness'))
  const instrumentalness = clamp01(avgFeature(topTrackIds, audioFeatures, 'instrumentalness'))
  const speechiness = clamp01(avgFeature(topTrackIds, audioFeatures, 'speechiness'))

  // Tempo: normalize spread. BPM 60..180 -> variance proxy.
  const tempos = topTrackIds.map((id) => audioFeatures[id]?.tempo).filter((v) => typeof v === 'number')
  const tempoMean = mean(tempos)
  const tempoVariance = clamp01(stddev(tempos) / 40) // ~40 BPM stddev => maxed
  const tempoNorm = clamp01((tempoMean - 60) / 120)

  // Loudness: dB -60..0 -> 0..1
  const loudnessVals = topTrackIds.map((id) => audioFeatures[id]?.loudness).filter((v) => typeof v === 'number')
  const loudness = clamp01((mean(loudnessVals) + 60) / 60)

  // Mainstreamness: avg track popularity (0..100 -> 0..1).
  const mainstreamness = clamp01(mean(topTracks.map((t) => t.popularity ?? 50)) / 100)

  // Recency overlap: how much of what you spin lately is in your all-time top.
  const overlap = recentIds.length
    ? recentIds.filter((id) => topTrackIds.includes(id)).length / recentIds.length
    : 0
  const recencyOverlap = clamp01(overlap)
  const recencyChurn = clamp01(1 - overlap)

  return {
    diversity,
    valence,
    energy,
    danceability,
    acousticness,
    instrumentalness,
    speechiness,
    tempoVariance,
    tempoNorm,
    tempoMean: Math.round(tempoMean),
    loudness,
    mainstreamness,
    recencyOverlap,
    recencyChurn,
    genreCounts,
    dnaMode,
  }
}

/* --------------------------- archetype scoring --------------------------- */
// Nearest-ideal classifier. Each archetype owns an ideal point in normalized
// feature space; we score by negative weighted squared distance and pick the
// closest. Pure: same metrics in -> same ranking out.
//
// Feature order: [diversity, mainstreamness, recencyOverlap, valence, energy,
//                 danceability, acousticness, instrumentalness, tempoVar, speech]

const FEATURE_KEYS = [
  'diversity', 'mainstreamness', 'recencyOverlap', 'valence', 'energy',
  'danceability', 'acousticness', 'instrumentalness', 'tempoVariance', 'speechiness',
]

// Importance per feature, per archetype — heavier on each archetype's "tell".
const IDEALS = {
  //            div   main  rec   val   ene   dnc   aco   ins   tvar  spe
  wanderer:   { v: [1.00, 0.20, 0.40, 0.50, 0.55, 0.50, 0.45, 0.30, 0.36, 0.10], w: [2.2, 2.0, 1, 1, 1, 1, 1, 1, 1, 1] },
  ritualist:  { v: [0.30, 0.55, 0.90, 0.45, 0.50, 0.50, 0.50, 0.20, 0.12, 0.08], w: [1.6, 1, 2.4, 1, 1, 1, 1, 1, 1, 1] },
  hedonist:   { v: [0.78, 0.72, 0.50, 0.85, 0.85, 0.90, 0.10, 0.05, 0.12, 0.12], w: [1, 1, 1, 1.8, 1.8, 2.0, 1, 1, 1, 1] },
  introspect: { v: [0.78, 0.25, 0.50, 0.30, 0.25, 0.35, 0.80, 0.20, 0.15, 0.06], w: [1, 1.4, 1, 1.4, 1.6, 1, 2.0, 1, 1, 1] },
  architect:  { v: [0.78, 0.40, 0.50, 0.45, 0.60, 0.50, 0.20, 0.85, 0.65, 0.04], w: [1, 1, 1, 1, 1.2, 1, 1, 2.2, 2.0, 1] },
  anarchist:  { v: [0.78, 0.43, 0.45, 0.20, 0.92, 0.50, 0.08, 0.25, 0.72, 0.20], w: [1, 1, 1, 1.6, 2.0, 1, 1, 1, 2.0, 1] },
  romantic:   { v: [0.78, 0.58, 0.55, 0.85, 0.40, 0.45, 0.78, 0.10, 0.13, 0.05], w: [1, 1, 1, 2.0, 1.4, 1, 1.8, 1, 1.2, 1] },
  zeitgeist:  { v: [0.78, 0.90, 0.15, 0.65, 0.70, 0.72, 0.15, 0.05, 0.17, 0.14], w: [1, 2.4, 2.0, 1, 1, 1, 1, 1, 1, 1] },
  ghost:      { v: [0.78, 0.16, 0.50, 0.35, 0.45, 0.30, 0.55, 0.90, 0.20, 0.03], w: [1, 1.8, 1, 1, 1, 1, 1, 2.4, 1, 1.4] },
  catalyst:   { v: [1.00, 0.52, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.32, 0.10], w: [2.0, 1.4, 1, 1.2, 1.2, 1.2, 1.2, 1.4, 1, 1] },
}

export function scoreArchetypes(m) {
  const x = FEATURE_KEYS.map((k) => m[k] ?? 0.5)
  return Object.entries(IDEALS)
    .map(([id, { v, w }]) => {
      let dist = 0
      let wsum = 0
      for (let i = 0; i < v.length; i++) {
        dist += w[i] * (x[i] - v[i]) ** 2
        wsum += w[i]
      }
      // score in 0..1: 1 = perfect match. (negative distance, normalized)
      return { id, score: 1 - dist / wsum }
    })
    .sort((a, b) => b.score - a.score)
}

/* ----------------------------- mood spectrum ----------------------------- */
// 5 separate audio-feature dimensions -> labelled sub-bars.

export function computeMoodSpectrum(m) {
  return {
    // overall position on Melancholy <-> Euphoric axis
    position: clamp01(m.valence * 0.6 + m.energy * 0.4),
    bars: [
      { key: 'acoustic', label: 'Acoustic', value: clamp01(m.acousticness) },
      { key: 'electric', label: 'Electric', value: clamp01(m.energy) },
      { key: 'kinetic', label: 'Kinetic', value: clamp01(m.danceability) },
      { key: 'cerebral', label: 'Cerebral', value: clamp01(m.instrumentalness) },
      { key: 'raw', label: 'Raw', value: clamp01((1 - m.valence) * 0.6 + m.speechiness * 0.4) },
    ],
  }
}

/* ----------------------------- listening clock --------------------------- */
// 24-hour play distribution from recently-played timestamps (real data).

const CLOCK_VIBES = [
  { from: 5, to: 8, label: 'Early Bird' },
  { from: 9, to: 11, label: 'Morning Mind' },
  { from: 12, to: 16, label: 'Daylight Drifter' },
  { from: 17, to: 20, label: 'Golden Hour' },
  { from: 21, to: 23, label: 'Night Owl' },
  { from: 0, to: 4, label: 'After Hours' },
]

export function computeClock(recentlyPlayed = []) {
  const hours = new Array(24).fill(0)
  let total = 0
  for (const r of recentlyPlayed) {
    if (!r.playedAt) continue
    const d = new Date(r.playedAt)
    if (Number.isNaN(d.getTime())) continue
    hours[d.getHours()] += 1
    total += 1
  }
  if (total === 0) return null

  let peakHour = 0
  hours.forEach((c, h) => {
    if (c > hours[peakHour]) peakHour = h
  })
  const vibe = CLOCK_VIBES.find((v) => peakHour >= v.from && peakHour <= v.to)
  return { hours, total, peakHour, label: vibe ? vibe.label : 'Free Spirit' }
}

/* --------------------------------- stats --------------------------------- */
// Punchy headline numbers, all from metadata Spotify still returns.

function medianYear(topTracks) {
  const years = topTracks
    .map((t) => parseInt(String(t.releaseDate || '').slice(0, 4), 10))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b)
  if (!years.length) return null
  return years[Math.floor(years.length / 2)]
}

export function computeStats(data, metrics) {
  const { topTracks = [] } = data
  const obscurity = Math.round((1 - metrics.mainstreamness) * 100)
  const explicitCount = topTracks.filter((t) => t.explicit).length
  const explicitPct = topTracks.length ? Math.round((explicitCount / topTracks.length) * 100) : 0

  const durations = topTracks.map((t) => t.durationMs).filter((d) => typeof d === 'number')
  const avgMs = durations.length ? mean(durations) : 0
  const avgSec = Math.round(avgMs / 1000)
  const avgLength = avgSec ? `${Math.floor(avgSec / 60)}:${String(avgSec % 60).padStart(2, '0')}` : '—'

  const vintage = medianYear(topTracks)

  return [
    { label: 'Obscurity', value: `${obscurity}` },
    { label: 'Explicit', value: `${explicitPct}%` },
    { label: 'Avg Length', value: avgLength },
    { label: 'Vintage', value: vintage ? `${vintage}` : '—' },
  ]
}

/* ----------------------------- archetype blend --------------------------- */
// Softmax over the ranked scores -> a primary % and a secondary streak.

export function computeBlend(ranked) {
  // Softmax over the top 3 only, sharpened so the primary clearly dominates.
  const top = ranked.slice(0, 3)
  const temp = 0.045
  const base = top[top.length - 1].score
  const exps = top.map((r) => Math.exp((r.score - base) / temp))
  const sum = exps.reduce((a, b) => a + b, 0) || 1
  const pct = (i) => Math.round((exps[i] / sum) * 100)
  return {
    primary: { id: ranked[0].id, name: ARCHETYPES[ranked[0].id].name, pct: pct(0) },
    secondary: { id: ranked[1].id, name: ARCHETYPES[ranked[1].id].name, pct: pct(1) },
  }
}

/* ------------------------------- top-level ------------------------------- */

export function analyze(data) {
  // When Spotify withholds audio features (403 for new apps), estimate them
  // deterministically from available metadata so the analysis still works.
  const estimatedAudio = audioFeaturesMissing(data.audioFeatures, data.topTracks)
  const workingData = estimatedAudio
    ? { ...data, audioFeatures: estimateAudioFeatures(data) }
    : data

  const metrics = computeMetrics(workingData)
  const ranked = scoreArchetypes(metrics)
  const archetype = ARCHETYPES[ranked[0].id]
  const genres = topGenres(metrics.genreCounts, 6)
  const mood = computeMoodSpectrum(metrics)
  const clock = computeClock(data.recentlyPlayed)
  const stats = computeStats(workingData, metrics)
  const blend = computeBlend(ranked)

  return {
    metrics,
    ranked,
    archetype,
    genres,
    mood,
    clock,
    stats,
    blend,
    dnaMode: metrics.dnaMode, // 'genre' | 'artist'
    estimatedAudio,
    genresAvailable: hasRealGenres(data.topArtists || []),
    displayName: data.displayName || 'Anonymous Listener',
    timeRange: data.timeRange || 'medium_term',
    signatureTracks: data.topTracks.slice(0, 3).map((t) => ({
      name: t.name,
      artist: t.artists?.[0]?.name || 'Unknown',
    })),
    // Top tracks for the playable list (real Spotify IDs in live mode).
    tracks: data.topTracks.slice(0, 10).map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artists?.[0]?.name || 'Unknown',
      image: t.image || null,
    })),
  }
}
