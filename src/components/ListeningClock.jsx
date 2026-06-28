// ListeningClock.jsx — radial 24-hour play distribution from recently-played
// timestamps. Each spoke is one hour; length ∝ plays, peak hour highlighted.

import { motion } from 'framer-motion'

function formatHour(h) {
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12} ${period}`
}

export default function ListeningClock({ clock, palette, size = 150, animate = true }) {
  if (!clock) return null
  const { hours, peakHour, label } = clock
  const cx = size / 2
  const cy = size / 2
  const ri = size * 0.16
  const ro = size * 0.46
  const max = Math.max(...hours, 1)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        {/* faint hour ticks */}
        <circle cx={cx} cy={cy} r={ri} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {hours.map((count, h) => {
          const angle = (h / 24) * 2 * Math.PI - Math.PI / 2
          const norm = count / max
          const len = ri + norm * (ro - ri)
          const x1 = cx + Math.cos(angle) * ri
          const y1 = cy + Math.sin(angle) * ri
          const x2 = cx + Math.cos(angle) * len
          const y2 = cy + Math.sin(angle) * len
          const isPeak = h === peakHour
          return (
            <motion.line
              key={h}
              x1={x1}
              y1={y1}
              x2={isPeak || !animate ? x2 : x1}
              y2={isPeak || !animate ? y2 : y1}
              initial={animate ? { x2: x1, y2: y1 } : false}
              animate={{ x2, y2 }}
              transition={{ duration: 0.6, delay: 0.2 + h * 0.012, ease: 'easeOut' }}
              stroke={isPeak ? palette.accent : palette.glow}
              strokeWidth={isPeak ? 4 : 3}
              strokeLinecap="round"
              opacity={isPeak ? 1 : 0.35 + norm * 0.5}
              style={isPeak ? { filter: `drop-shadow(0 0 4px ${palette.accent})` } : undefined}
            />
          )
        })}
        <text x={cx} y={cy + 3} textAnchor="middle" fill="currentColor" opacity="0.85" style={{ fontSize: 11, fontWeight: 600 }}>
          {formatHour(peakHour)}
        </text>
      </svg>
      <div className="mt-1 font-display text-sm font-semibold" style={{ color: palette.glow }}>
        {label}
      </div>
    </div>
  )
}
