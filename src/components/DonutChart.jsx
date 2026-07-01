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

      {/* contained legend — built as explicit paired rows using `margin`
          for spacing, NOT the CSS `gap` property. html2canvas (1.4.x) does
          not reliably support `gap` on flexbox: the browser renders spacing
          correctly, but capture collapses rows onto each other because the
          gap is silently dropped. Margin is the safe, well-supported
          alternative for anything that gets captured to PNG. */}
      <div className="mt-3 w-full">
        {Array.from({ length: Math.ceil(segments.length / 2) }, (_, row) => (
          <div key={row} className="flex" style={{ marginTop: row === 0 ? 0 : 4 }}>
            {[0, 1].map((col) => {
              const s = segments[row * 2 + col]
              if (!s) return <div key={col} style={{ width: '50%' }} />
              return (
                <div
                  key={col}
                  className="flex items-center text-[10px] leading-tight"
                  style={{ width: '50%', minWidth: 0, paddingRight: col === 0 ? 8 : 0 }}
                >
                  <span
                    className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ background: s.color, marginRight: 5 }}
                  />
                  <span
                    className="truncate"
                    style={{ color: 'currentColor', opacity: 0.85, flex: '1 1 auto', minWidth: 0, marginRight: 4 }}
                  >
                    {s.name}
                  </span>
                  <span className="shrink-0 tabular-nums" style={{ color: s.color }}>
                    {s.pct}%
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
