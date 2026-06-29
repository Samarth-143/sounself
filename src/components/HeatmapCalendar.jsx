// HeatmapCalendar.jsx — 7x24 listening activity grid (day × hour).
// Derived from recently-played `played_at` timestamps.

import { useMemo } from 'react'
import { motion } from 'framer-motion'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function HeatmapCalendar({ heatmap = null, accent = '#ff5a3c' }) {
  const grid = heatmap
  if (!grid) return null

  const max = useMemo(() => {
    let m = 0
    grid.forEach((row) => row.forEach((v) => { if (v > m) m = v }))
    return m || 1
  }, [grid])

  const intensity = (v) => {
    if (v === 0) return 'rgba(255,255,255,0.04)'
    const t = Math.min(1, v / max)
    return `rgba(255,255,255,${0.06 + t * 0.55})`
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-[1100px]">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-4 w-4 items-center justify-center rounded bg-white/10">
            <svg className="h-3 w-3 text-ash" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h2 className="font-display text-lg font-semibold">Listening Calendar</h2>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-ash/70">7 days × 24 hrs</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex min-w-max flex-col gap-1">
          {/* Hour labels */}
          <div className="flex">
            <div className="mr-1 w-8" />
            {[0, 6, 12, 18, 23].map((h) => (
              <div key={h} className="w-4 text-center text-[9px] tabular-nums text-ash/60">
                {h}
              </div>
            ))}
          </div>
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center">
              <div className="mr-1 w-8 text-right text-[10px] uppercase tracking-wide text-ash/70">
                {day}
              </div>
              <div className="flex gap-0.5">
                {grid[di].map((v, hi) => (
                  <div
                    key={hi}
                    className="h-3 w-3.5 rounded-sm transition"
                    style={{ background: intensity(v) }}
                    title={`${day} ${String(hi).padStart(2, '0')}:00 — ${v} plays`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
