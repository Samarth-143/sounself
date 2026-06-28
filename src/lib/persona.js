// persona.js
// Procedural "music alter ego". Deterministic: derived from the user's data,
// no Math.random. Name pools are disjoint per archetype, so two different
// archetypes can never resolve to the same persona name.

// Archetype-specific adjective pools (disjoint across archetypes).
const ADJ = {
  wanderer: ['Nomadic', 'Drifting', 'Borderless', 'Roaming'],
  ritualist: ['Devout', 'Cyclical', 'Liturgical', 'Steadfast'],
  hedonist: ['Molten', 'Saccharine', 'Neon', 'Reckless'],
  introspect: ['Hollow', 'Glasswater', 'Dusk-lit', 'Quiet'],
  architect: ['Tessellated', 'Modular', 'Crystalline', 'Geometric'],
  anarchist: ['Serrated', 'Riotous', 'Static', 'Feral'],
  romantic: ['Velvet', 'Honeyed', 'Aching', 'Tender'],
  zeitgeist: ['Viral', 'Chromatic', 'Trending', 'Holographic'],
  ghost: ['Vapor', 'Unseen', 'Phantom', 'Submerged'],
  catalyst: ['Polychrome', 'Kinetic', 'Alloyed', 'Unbound'],
}

// Noun pools keyed by valence/energy quadrant.
const NOUN = {
  bright_high: ['Comet', 'Carnival', 'Supernova', 'Pulse'],
  bright_low: ['Meadow', 'Lantern', 'Tide', 'Ember'],
  dark_high: ['Riot', 'Engine', 'Storm', 'Furnace'],
  dark_low: ['Hollow', 'Monolith', 'Fog', 'Requiem'],
}

const CALLSIGN = ['NOVA', 'ECHO', 'VYNL', 'AXIS', 'HALO', 'KORE', 'FLUX', 'ZephYR', 'ORBT', 'MYTH']

// Quote fragments, assembled into one sentence.
const OPENERS = [
  'Born from',
  'Forged in',
  'Conjured between',
  'Distilled out of',
  'Assembled from',
]
const MIDDLES = {
  bright_high: ['midnight dancefloors', 'sunlit static', 'a thousand encores'],
  bright_low: ['slow golden hours', 'warm vinyl crackle', 'unsent love letters'],
  dark_high: ['blown-out speakers', 'electrical storms', 'concrete and feedback'],
  dark_low: ['empty 3am rooms', 'rain on glass', 'the quiet after the song ends'],
}
const CLOSERS = [
  'and refusing to apologize for any of it.',
  'and still hungry for the next track.',
  'and humming a melody no one else can hear.',
  'and pressing play one more time.',
  'and leaving the volume exactly where it hurts.',
]

/* ------------------------------- helpers -------------------------------- */

// Simple deterministic string hash -> 32-bit int.
function hashStr(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const pick = (arr, seed) => arr[Math.abs(Math.trunc(seed)) % arr.length]

function quadrant(valence, energy) {
  const bright = valence >= 0.5
  const high = energy >= 0.5
  if (bright && high) return 'bright_high'
  if (bright && !high) return 'bright_low'
  if (!bright && high) return 'dark_high'
  return 'dark_low'
}

/* ------------------------------ generator ------------------------------- */

export function generatePersona({ archetypeId, metrics, topGenre = 'sound', displayName = '' }) {
  const { valence, energy, tempoMean = 120 } = metrics
  const quad = quadrant(valence, energy)

  // Seed blends identity + taste so it's stable per-user but varied across users.
  const seed = hashStr(`${displayName}|${archetypeId}|${topGenre}|${Math.round(valence * 100)}|${tempoMean}`)

  const adjPool = ADJ[archetypeId] || ADJ.catalyst
  const adj = pick(adjPool, seed)
  const noun = pick(NOUN[quad], seed >> 3)

  // Two naming styles, chosen by tempo parity for variety.
  let name
  if (tempoMean % 2 === 0) {
    name = `The ${adj} ${noun}`
  } else {
    const callsign = pick(CALLSIGN, seed >> 5).toUpperCase()
    const num = (seed % 9) + 1
    name = `${callsign}-${num}`
  }

  const quote = [
    pick(OPENERS, seed >> 7),
    pick(MIDDLES[quad], seed >> 9),
    pick(CLOSERS, seed >> 11),
  ].join(' ')

  return { name, quote, quadrant: quad }
}
