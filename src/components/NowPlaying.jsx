// NowPlaying.jsx — Spotify-style full player card:
// large album art, centered info, seekable progress, and playback controls.

import { useEffect, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Music } from './icons.jsx'

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function NowPlaying({ playback, accent, onToggle, onSeek, onPrev, onNext }) {
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
    <div className="flex flex-col">
      {/* Album art */}
      <div className="mx-auto mb-6 aspect-square w-full max-w-[280px] overflow-hidden rounded-lg bg-white/5 shadow-2xl">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music className="h-16 w-16 text-ash/30" />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="mb-5 px-2 text-center">
        <div className="truncate text-base font-semibold text-bone">{name || '—'}</div>
        <div className="mt-1 truncate text-sm text-ash">{artist}</div>
      </div>

      {/* Progress bar */}
      <div className="mb-5 flex items-center gap-3 px-4">
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ash">{fmt(elapsed)}</span>
        <div
          className="group relative h-1 flex-1 cursor-pointer rounded-full bg-white/15"
          onClick={handleSeek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-bone"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone opacity-0 shadow-lg transition group-hover:opacity-100"
            style={{ left: `${pct}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-left text-xs tabular-nums text-ash">{fmt(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8">
        <button
          onClick={onPrev}
          className="flex items-center justify-center text-bone transition hover:scale-110"
          aria-label="Previous"
        >
          <SkipBack className="h-6 w-6" />
        </button>

        <button
          onClick={onToggle}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-bone text-black transition hover:scale-105 active:scale-95"
          aria-label={paused ? 'Play' : 'Pause'}
        >
          {paused ? <Play className="h-7 w-7 pl-0.5" /> : <Pause className="h-7 w-7" />}
        </button>

        <button
          onClick={onNext}
          className="flex items-center justify-center text-bone transition hover:scale-110"
          aria-label="Next"
        >
          <SkipForward className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
