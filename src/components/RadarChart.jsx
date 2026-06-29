// RadarChart.jsx — 10-axis radar chart showing user metrics vs archetype ideal.
// Displays how closely the user matches the winning archetype's ideal point.

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FEATURE_KEYS, IDEALS } from '../lib/algorithm.js'

const LABELS = [
  { key: 'diversity', short: 'Genre Mix' },
  { key: 'mainstreamness', short: 'Mainstream' },
  { key: 'recencyOverlap', short: 'Rotation' },
  { key: 'valence', short: 'Positivity' },
  { key: 'energy', short: 'Energy' },
  { key: 'danceability', short: 'Dance' },
  { key: 'acousticness', short: 'Acoustic' },
  { key: 'instrumentalness', short: 'Instr.' },
  { key: 'tempoVariance', short: 'Tempo Var' },
  { key: 'speechiness', short: 'Speech' },
]

export default function RadarChart({ metrics, ranked, accent = '#ff5a3c' }) {
  const winningId = ranked?.[0]?.id
  const ideals = winningId ? IDEALS[winningId]?.v : null

  const points = useMemo(() => {
    if (!ideals) return null
    const cx = 140
    const cy = 140
    const r = 100
    const n = FEATURE_KEYS.length
    const userPath = []
    const idealPath = []
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const val = metrics[FEATURE_KEYS[i]] ?? 0.5
      userPath.push({
        x: cx + r * val * Math.cos(angle),
        y: cy + r * val * Math.sin(angle),
      })
      idealPath.push({
        x: cx + r * ideals[i] * Math.cos(angle),
        y: cy + r * ideals[i] * Math.sin(angle),
      })
    }
    return { cx, cy, r, n, userPath, idealPath }
  }, [metrics, ideals])

  if (!points) return null

  const { cx, cy, r, n, userPath, idealPath } = points
  const pathD = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  const gridLevels = [0.25, 0.5, 0.75, 1.0]

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 320 320" className="h-72 w-72">
        {/* grid */}
        {gridLevels.map((lvl) => (
          <polygon
            key={lvl}
            points={Array.from({ length: n }, (_, i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2
              return `${cx + r * lvl * Math.cos(angle)},${cy + r * lvl * Math.sin(angle)}`
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
        ))}
        {/* axes */}
        {Array.from({ length: n }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2
          const ex = cx + r * Math.cos(angle)
          const ey = cy + r * Math.sin(angle)
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <text
                x={ex + 8 * Math.cos(angle)}
                y={ey + 8 * Math.sin(angle)}
                fill="rgba(255,255,255,0.65)"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {LABELS[i].short}
              </text>
            </g>
          )
        })}
        {/* ideal outline */}
        <path
          d={pathD(idealPath)}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        {/* user fill */}
        <motion.path
          d={pathD(userPath)}
          fill={accent}
          fillOpacity="0.25"
          stroke={accent}
          strokeWidth="2.5"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        {/* user dots */}
        {userPath.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={accent} />
        ))}
        {/* center */}
        <circle cx={cx} cy={cy} r="2" fill="rgba(255,255,255,0.4)" />
      </svg>
    </div>
  )
}
