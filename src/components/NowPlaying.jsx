// NowPlaying.jsx — Spotify-style now-playing bar for SDK playback:
// album cover + title/artist + a live, seekable progress bar.

import { useEffect, useState } from 'react'
import { Play, Pause, Music } from './icons.jsx'

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function NowPlaying({ playback, accent, onToggle, onSeek }) {
  // Local ticker so the bar advances smoothly between SDK state events.
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [])

  const { paused, position = 0, duration = 0, updatedAt = performance.now(), name, artist, image } = playback
  const elapsed = paused ? position : Math.min(duration, position + (performance.now() - updatedAt))
  const pct = duration ? Math.min(100, (elapsed / duration) * 100) : 0

  const handleSeek = (e) => {
    if (!duration || !onSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(Math.round(Math.max(0, Math.min(1, ratio)) * duration))
  }

  return (
    <div className="mt-3 flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      {/* album cover */}
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/10"
        style={{ boxShadow: `0 6px 18px -6px ${accent}88` }}
      >
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Music className="h-5 w-5 text-ash" />
        )}
      </div>

      {/* play / pause */}
      <button
        onClick={onToggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:brightness-110"
        style={{ background: accent, color: '#070707' }}
        aria-label={paused ? 'Play' : 'Pause'}
      >
        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </button>

      {/* info + progress */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-bone">{name || '—'}</div>
        <div className="mb-1.5 truncate text-xs text-ash">{artist}</div>
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-ash">{fmt(elapsed)}</span>
          <div
            className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/12"
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${pct}%`, background: accent }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition group-hover:opacity-100"
              style={{ left: `${pct}%`, background: accent }}
            />
          </div>
          <span className="w-9 shrink-0 text-[10px] tabular-nums text-ash">{fmt(duration)}</span>
        </div>
      </div>
    </div>
  )
}
