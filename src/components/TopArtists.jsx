// TopArtists.jsx — shows the user's top artists with genres and popularity.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Music, Loader2 } from './icons.jsx'

export default function TopArtists({ artists = [], accent = '#ff5a3c' }) {
  const list = artists.slice(0, 10)
  if (!list.length) return null

  // Diagnostic: log first artist's raw popularity to console
  if (list[0] && typeof list[0].popularity === 'number') {
    console.log('[TopArtists] Raw popularity sample:', list[0].name, list[0].popularity)
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-[1100px]">
      <div className="mb-3 flex items-center gap-2">
        <Music className="h-4 w-4" style={{ color: accent }} />
        <h2 className="font-display text-lg font-semibold">Your Top Artists</h2>
        <span className="text-[10px] text-ash/50">Popularity 0–100 (Spotify score)</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {list.map((a, i) => (
          <motion.div
            key={a.id || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="mb-2 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
              {a.image ? (
                <img src={a.image} alt={a.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-ash/40">{a.name?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-bone" title={a.name}>{a.name}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(a.genres || []).slice(0, 2).map((g) => (
                  <span
                    key={g}
                    className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-ash/80"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between text-[10px] tabular-nums text-ash/70">
                <span className="uppercase tracking-wide">Pop.</span>
                <span className="font-medium">{a.popularity ?? 50}</span>
              </div>
              <div className="mt-1.5 flex h-1.5 items-center gap-0.5">
                <div className="h-full flex-1 rounded-full bg-white/8" />
                {[25, 50, 75].map((mark) => (
                  <div key={mark} className="h-full w-px bg-white/10" />
                ))}
                <div className="h-full flex-1 rounded-full bg-white/8" />
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${a.popularity ?? 50}%`,
                    background: accent,
                    opacity: 0.5 + ((a.popularity ?? 50) / 100) * 0.5,
                  }}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[8px] tabular-nums text-ash/40">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
