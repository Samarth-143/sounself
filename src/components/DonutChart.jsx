// DonutChart.jsx — custom SVG donut for Genre / Artist DNA with a contained
// legend (color dot + name + %). A radial legend overflowed the narrow column,
// so the legend lives directly under the ring and never collides.

export default function DonutChart({ genres = [], wheel = [], size = 160, stroke = 22, centerLabel = 'GENRES' }) {
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  const total = genres.reduce((a, g) => a + g.pct, 0) || 1
  let acc = 0

  const segments = genres.map((g, i) => {
    const frac = g.pct / total
    const dash = frac * circumference
    const seg = {
      color: wheel[i % wheel.length],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -acc * circumference,
      ...g,
    }
    acc += frac
    return seg
  })

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <text
          x={cx}
          y={cy - 5}
          textAnchor="middle"
          className="font-display"
          fill="currentColor"
          style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          {genres.length}
        </text>
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          fill="currentColor"
          opacity="0.55"
          style={{ fontSize: 8, letterSpacing: '0.18em' }}
        >
          {centerLabel}
        </text>
      </svg>

      {/* contained legend */}
      <div className="mt-3 grid w-full grid-cols-2 gap-x-3 gap-y-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] leading-tight">
            <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: 'currentColor', opacity: 0.85 }}>
              {s.name}
            </span>
            <span className="shrink-0 tabular-nums" style={{ color: s.color }}>
              {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
