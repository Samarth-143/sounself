// TopTracks.jsx — playable list of the user's top tracks.
//
// Playback strategy (best → fallback):
//   1. Premium + streaming scope -> Web Playback SDK plays FULL tracks in-app.
//   2. Missing streaming scope    -> prompt to reconnect; meanwhile use embed.
//   3. Non-Premium / demo / error -> Spotify embed (30s preview / full if the
//      browser can read an open.spotify.com session).

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Music, Loader2 } from './icons.jsx'
import NowPlaying from './NowPlaying.jsx'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer.js'
import { playTrackOnDevice, hasStreamingScope, redirectToAuth, isConfigured } from '../lib/spotifyApi.js'

const isRealId = (id) => typeof id === 'string' && /^[A-Za-z0-9]{22}$/.test(id)

// Verified real Spotify track IDs for demo playback.
const DEMO_POOL = [
  { id: '0VjIjW4GlUZAMYd2vXMi3b', name: 'Blinding Lights', artist: 'The Weeknd' },
  { id: '4LRPiXqCikLlN15c3yImP7', name: 'As It Was', artist: 'Harry Styles' },
  { id: '2Fxmhks0bxGSBdJ92vM42m', name: 'bad guy', artist: 'Billie Eilish' },
  { id: '39LLxExYz6ewLAcYrzQQyP', name: 'Levitating', artist: 'Dua Lipa' },
  { id: '0v2boHmWtxMTD2REGN8MbK', name: 'Levitating (feat. DaBaby)', artist: 'Dua Lipa' },
]

export default function TopTracks({ tracks = [], accent = '#ff5a3c' }) {
  const isDemo = tracks.length === 0 || tracks.some((t) => !isRealId(t.id))
  const list = isDemo ? DEMO_POOL : tracks.slice(0, 10)

  // Only attempt SDK playback when live + streaming scope is already granted.
  const sdkEligible = isConfigured() && !isDemo && hasStreamingScope()
  const player = useSpotifyPlayer(sdkEligible)
  const useSdk = player.status === 'ready'

  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)

  // Reconnect needed: live + Premium playback wanted but scope not granted yet.
  const needsReconnect = isConfigured() && !isDemo && !hasStreamingScope()

  if (!list.length) return null

  const handleSelect = async (i) => {
    setError('')
    if (useSdk) {
      if (selected === i) {
        player.toggle()
        return
      }
      setPending(i)
      try {
        await playTrackOnDevice(list[i].id, player.deviceId)
        setSelected(i)
      } catch (e) {
        setError(e?.message === 'PREMIUM_REQUIRED' ? 'Spotify Premium is required for full playback.' : e?.message || 'Could not start playback.')
        setSelected(i) // fall back to embed below
      } finally {
        setPending(null)
      }
    } else {
      setSelected(selected === i ? null : i)
    }
  }

  const isRowPlaying = (i) =>
    useSdk ? selected === i && player.playback && !player.playback.paused : selected === i

  return (
    <div className="mx-auto mt-10 w-full max-w-[1100px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4" style={{ color: accent }} />
          <h2 className="font-display text-lg font-semibold">Your Top Tracks</h2>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-ash/70">
          {isDemo ? 'demo audio' : useSdk ? 'full playback' : 'preview'}
        </span>
      </div>

      {/* reconnect prompt for full playback */}
      {needsReconnect && (
        <div
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
          style={{ borderColor: `${accent}55`, background: 'rgba(255,255,255,0.03)' }}
        >
          <span className="text-xs text-ash">
            Reconnect to enable full-track playback with your Premium account.
          </span>
          <button
            onClick={() => redirectToAuth().catch(() => {})}
            className="rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ background: accent, color: '#070707' }}
          >
            Reconnect Spotify
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
        {/* Track list */}
        <div className="w-full md:w-[55%]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            {list.map((t, i) => {
              const active = selected === i
              const playing = isRowPlaying(i)
  const handlePrev = async () => {
    if (selected === null || selected <= 0) return
    await handleSelect(selected - 1)
  }
  const handleNext = async () => {
    if (selected === null || selected >= list.length - 1) return
    await handleSelect(selected + 1)
  }

  return (
                <button
                  key={`${t.id}-${i}`}
                  onClick={() => handleSelect(i)}
                  disabled={pending !== null}
                  className="flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-2.5 text-left transition last:border-b-0 hover:bg-white/[0.05] disabled:opacity-60"
                  style={active ? { background: 'rgba(255,255,255,0.06)' } : undefined}
                >
                  <span className="w-5 shrink-0 text-center text-xs tabular-nums text-ash">{i + 1}</span>
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/10"
                  >
                    {t.image ? (
                      <img src={t.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Music className="h-4 w-4 text-ash" />
                    )}
                  </span>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition"
                    style={{ background: active ? accent : 'rgba(255,255,255,0.08)', color: active ? '#070707' : accent }}
                  >
                    {pending === i ? (
                      <Loader2 className="h-3 w-3 animate-spin-slow" />
                    ) : playing ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-bone">{t.name}</span>
                    <span className="block truncate text-xs text-ash">{t.artist}</span>
                  </span>
                  {playing && (
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.16em]" style={{ color: accent }}>
                      Playing
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {error && <p className="mt-2 text-center text-xs text-ember">{error}</p>}
        </div>

        {/* Player window */}
        <AnimatePresence>
          {selected !== null && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full md:w-[45%]"
            >
              <div className="flex h-full flex-col justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5">
                {useSdk && !error && player.playback ? (
                  <NowPlaying
                    playback={player.playback}
                    accent={accent}
                    onToggle={player.toggle}
                    onSeek={player.seek}
                    onPrev={handlePrev}
                    onNext={handleNext}
                  />
                ) : (
                  <>
                    <div className="flex flex-col items-center">
                      <iframe
                        title="Spotify player"
                        src={`https://open.spotify.com/embed/track/${list[selected].id}?utm_source=soundself&theme=0`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        style={{ borderRadius: 12 }}
                      />
                    </div>
                    <p className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-ash/60">
                      {isDemo
                        ? 'Demo audio · full playback uses your library in live mode'
                        : 'Preview player · reconnect with Premium for full tracks'}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
