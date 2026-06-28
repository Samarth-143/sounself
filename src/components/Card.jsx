// Card.jsx — the product. A fixed 1200x675 (or 1080x1080) canvas that
// recolors entirely from the archetype palette. Forwards a ref so the
// export pipeline can capture exactly this node.

import { forwardRef, useState } from 'react'
import DonutChart from './DonutChart.jsx'
import MoodSpectrum from './MoodSpectrum.jsx'
import ListeningClock from './ListeningClock.jsx'

const TIME_LABELS = {
  short_term: 'Last 4 Weeks',
  medium_term: 'Last 6 Months',
  long_term: 'All Time',
}

// Plain-language meaning for each headline stat (shown on hover / tap).
const STAT_INFO = {
  Obscurity:
    'How far off the beaten path your taste sits. 100 = deep cuts only, 0 = pure chart-toppers. Based on the average popularity of your top tracks.',
  Explicit: 'The share of your top tracks that Spotify flags as explicit.',
  'Avg Length': 'The average duration of your top tracks.',
  Vintage: 'The median release year of your top tracks — the era your taste lives in.',
}

// hex -> rgba string. html2canvas (1.4.x) is unreliable parsing 8-digit hex,
// so all translucent fills are built explicitly here.
function rgba(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

const Card = forwardRef(function Card(
  { analysis, persona, capturing = false, format = 'landscape' },
  ref
) {
  const { archetype, genres, mood, displayName, timeRange, signatureTracks, blend, stats, clock } = analysis
  const dnaLabel = analysis.dnaMode === 'artist' ? 'Artist DNA' : 'Genre DNA'
  const shortName = (n) => n.replace(/^The\s+/, '')
  const p = archetype.palette
  const [openStat, setOpenStat] = useState(null)
  const square = format === 'square'
  const size = square ? { width: 1080, height: 1080 } : { width: 1200, height: 675 }

  return (
    <div
      ref={ref}
      className="card-grain relative overflow-hidden"
      style={{
        ...size,
        color: p.ink,
        background: `radial-gradient(120% 90% at 78% 12%, ${rgba(p.glow, 0.15)} 0%, transparent 55%),
                     radial-gradient(90% 80% at 10% 100%, ${rgba(p.accent, 0.12)} 0%, transparent 50%),
                     linear-gradient(160deg, ${p.base} 0%, #050505 100%)`,
        fontFamily: '"IBM Plex Mono", monospace',
      }}
    >
      <div className="relative z-10 flex h-full flex-col px-12 py-9">
        {/* A) HEADER STRIP */}
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: p.glow, boxShadow: `0 0 12px ${p.glow}` }}
            />
            <span className="font-display text-lg font-semibold tracking-tight" style={{ color: p.ink }}>
              SoundSelf
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.18em] opacity-70">{displayName}</span>
            <span
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]"
              style={{ background: rgba(p.glow, 0.13), border: `1px solid ${rgba(p.glow, 0.4)}`, color: p.glow }}
            >
              {TIME_LABELS[timeRange] || 'Last 6 Months'}
            </span>
          </div>
        </header>

        {/* BODY — three balanced columns */}
        <div className="flex flex-1 gap-8 pt-6">
          {/* COL A — archetype + alter ego */}
          <div className="flex w-[41%] flex-col">
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-[0.28em] opacity-60">Listening Archetype</div>
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 48, lineHeight: 1 }}>{archetype.emoji}</span>
                <h1
                  className="font-display font-bold leading-[0.9] tracking-[-0.02em]"
                  style={{ fontSize: square ? 70 : 58, color: p.ink }}
                >
                  {archetype.name}
                </h1>
              </div>

              {/* secondary archetype blend */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  className="rounded-full px-2 py-[2px] font-semibold"
                  style={{ background: rgba(p.glow, 0.16), border: `1px solid ${rgba(p.glow, 0.45)}`, color: p.glow }}
                >
                  {blend.primary.pct}% {shortName(blend.primary.name)}
                </span>
                <span className="opacity-70">
                  + {blend.secondary.pct}% {shortName(blend.secondary.name)} streak
                </span>
              </div>

              <p className="mt-4 max-w-md text-sm leading-relaxed opacity-90">
                {archetype.descriptor[0]}
                <br />
                {archetype.descriptor[1]}
              </p>
              <p className="mt-3 max-w-md text-xs italic leading-relaxed" style={{ color: p.glow }}>
                Shadow — {archetype.shadow}
              </p>
            </div>

            {/* MUSIC ALTER EGO */}
            <div className="mt-auto pt-5">
              <div className="mb-1 text-[11px] uppercase tracking-[0.28em] opacity-60">Music Alter Ego</div>
              <div className="font-display text-3xl font-semibold tracking-tight" style={{ color: p.accent }}>
                {persona.name}
              </div>
              <p className="mt-1 max-w-md text-xs italic opacity-80">“{persona.quote}”</p>
              <div className="mt-3 flex flex-col gap-1.5">
                {signatureTracks.map((t, i) => (
                  <span
                    key={i}
                    className="truncate rounded-md px-2 py-1 text-[10px]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <span style={{ color: p.glow }}>{String(i + 1).padStart(2, '0')}</span> {t.name}
                    <span className="opacity-50"> — {t.artist}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* COL B — DNA donut + mood spectrum */}
          <div className="flex w-[33%] flex-col justify-between">
            <div className="flex flex-col items-center">
              <div className="mb-3 text-[11px] uppercase tracking-[0.28em] opacity-60">{dnaLabel}</div>
              <DonutChart
                genres={genres}
                wheel={archetype.wheel}
                size={square ? 188 : 158}
                centerLabel={analysis.dnaMode === 'artist' ? 'ARTISTS' : 'GENRES'}
              />
            </div>
            <div className="w-full">
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] opacity-60">
                Mood Spectrum
                {analysis.estimatedAudio && (
                  <span
                    className="rounded-full px-1.5 py-[1px] text-[8px] tracking-[0.1em]"
                    style={{ border: `1px solid ${rgba(p.ink, 0.25)}`, opacity: 0.7 }}
                    title="Estimated from metadata — Spotify restricts audio features for new apps"
                  >
                    EST.
                  </span>
                )}
              </div>
              <MoodSpectrum mood={mood} palette={p} animate={!capturing} />
            </div>
          </div>

          {/* COL C — listening clock + stat grid */}
          <div className="flex w-[26%] flex-col justify-between">
            <div className="flex flex-col items-center">
              <div className="mb-2 text-[11px] uppercase tracking-[0.28em] opacity-60">
                {clock ? 'Listening Clock' : 'Listening'}
              </div>
              {clock ? (
                <ListeningClock clock={clock} palette={p} size={square ? 170 : 148} animate={!capturing} />
              ) : (
                <div className="py-6 text-center text-xs opacity-50">No recent plays</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {stats.map((s) => {
                const open = !capturing && openStat === s.label
                return (
                  <div
                    key={s.label}
                    className="relative rounded-lg px-3 py-2 transition-colors"
                    style={{
                      background: open ? rgba(p.glow, 0.1) : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${open ? rgba(p.glow, 0.5) : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setOpenStat(s.label)}
                    onMouseLeave={() => setOpenStat((cur) => (cur === s.label ? null : cur))}
                    onClick={() => setOpenStat((cur) => (cur === s.label ? null : s.label))}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-display text-xl font-semibold leading-none" style={{ color: p.ink }}>
                        {s.value}
                      </div>
                      <span
                        className="flex h-3 w-3 items-center justify-center rounded-full text-[8px] leading-none"
                        style={{ border: `1px solid ${rgba(p.ink, 0.3)}`, opacity: 0.6 }}
                      >
                        i
                      </span>
                    </div>
                    <div className="mt-1 text-[9px] uppercase tracking-[0.16em] opacity-55">{s.label}</div>

                    {open && (
                      <div
                        className="absolute z-30 w-[210px] rounded-lg p-3 text-left shadow-2xl"
                        style={{
                          bottom: 'calc(100% + 8px)',
                          right: 0,
                          background: '#0c0c0f',
                          border: `1px solid ${rgba(p.glow, 0.45)}`,
                          color: p.ink,
                        }}
                      >
                        <div className="font-display text-sm font-semibold" style={{ color: p.glow }}>
                          {s.label}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug opacity-80">{STAT_INFO[s.label]}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Watermark — hidden in the live UI, revealed only during PNG capture */}
      <div
        className="absolute bottom-3 right-5 z-20 font-mono text-[11px] tracking-[0.2em]"
        style={{ opacity: capturing ? 0.5 : 0, color: p.ink }}
      >
        MADE WITH ◐ SOUNDSELF
      </div>
    </div>
  )
})

export default Card
