// Result.jsx — frames the card, adds the time-range toggle, share controls,
// and (in demo mode) an archetype shuffle. Scales the fixed-size card to fit.

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Card from './Card.jsx'
import Share from './Share.jsx'
import TopTracks from './TopTracks.jsx'
import TopArtists from './TopArtists.jsx'
import RadarChart from './RadarChart.jsx'
import HeatmapCalendar from './HeatmapCalendar.jsx'
import { Shuffle, RotateCcw } from './icons.jsx'

const RANGES = [
  { id: 'short_term', label: '4 Weeks' },
  { id: 'medium_term', label: '6 Months' },
  { id: 'long_term', label: 'All Time' },
]

const CARD_W = 1200
const CARD_H = 675

function ScaledCard({ children }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const compute = () => {
      const w = wrapRef.current?.offsetWidth || CARD_W
      setScale(Math.min(1, w / CARD_W))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return (
    <div ref={wrapRef} className="w-full" style={{ height: CARD_H * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CARD_W, height: CARD_H }}>
        {children}
      </div>
    </div>
  )
}

export default function Result({
  analysis,
  persona,
  timeRange,
  onTimeRange,
  onShuffle,
  onReset,
  configured,
  busyRange,
}) {
  const cardRef = useRef(null)
  const captureRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const accent = analysis.archetype.palette.glow

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
      {/* top controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: accent }} />
          <span className="font-display text-xl font-semibold">SoundSelf</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* time range toggle */}
          <div className="flex rounded-full border border-white/12 bg-white/5 p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => onTimeRange(r.id)}
                disabled={busyRange}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium transition disabled:opacity-50"
                style={
                  timeRange === r.id
                    ? { background: accent, color: '#070707' }
                    : { color: '#8b8780' }
                }
              >
                {r.label}
              </button>
            ))}
          </div>

          {!configured && (
            <button
              onClick={onShuffle}
              className="flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-xs text-bone transition hover:bg-white/10"
              title="Cycle through archetypes (demo)"
            >
              <Shuffle className="h-3.5 w-3.5" /> Shuffle
            </button>
          )}

          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-xs text-bone transition hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {configured ? 'Disconnect' : 'Restart'}
          </button>
        </div>
      </div>

      {/* the card — visible scaled version */}
      <motion.div
        key={`${analysis.archetype.id}-${timeRange}`}
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        style={{ boxShadow: `0 30px 80px -30px ${accent}55` }}
      >
        <ScaledCard>
          <Card ref={cardRef} analysis={analysis} persona={persona} capturing={capturing} />
        </ScaledCard>
      </motion.div>

      {/* hidden full-size card for clean html2canvas capture */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: CARD_W,
          height: CARD_H,
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <Card ref={captureRef} analysis={analysis} persona={persona} capturing={capturing} />
      </div>

      {/* share controls — capture the hidden full-size card */}
      <div className="mt-8">
        <Share
          cardRef={captureRef}
          setCapturing={setCapturing}
          fileBase={analysis.archetype.name}
          accent={accent}
        />
        <p className="mt-4 text-center text-[11px] uppercase tracking-[0.2em] text-ash/60">
          Exports a 1200×675 PNG at 2× · watermarked
        </p>
      </div>

      {/* playable top tracks */}
      <TopTracks tracks={analysis.tracks} accent={accent} />

      {/* radar + top artists */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <RadarChart metrics={analysis.metrics} ranked={analysis.ranked} accent={accent} />
        <TopArtists artists={analysis.topArtists} accent={accent} />
      </div>

      {/* listening heatmap */}
      <HeatmapCalendar heatmap={analysis.heatmap} accent={accent} />
    </div>
  )
}
