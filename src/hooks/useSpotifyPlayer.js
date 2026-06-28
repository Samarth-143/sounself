// useSpotifyPlayer.js — loads the Spotify Web Playback SDK and exposes a
// browser playback device for full-track playback (Premium only).
// Status: disabled | loading | ready | premium | auth | unsupported

import { useEffect, useRef, useState } from 'react'
import { getAccessToken } from '../lib/spotifyApi.js'

let sdkPromise = null
function loadSdk() {
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve) => {
    if (window.Spotify) return resolve(true)
    window.onSpotifyWebPlaybackSDKReady = () => resolve(true)
    const tag = document.createElement('script')
    tag.src = 'https://sdk.scdn.co/spotify-player.js'
    tag.async = true
    tag.onerror = () => resolve(false)
    document.body.appendChild(tag)
  })
  return sdkPromise
}

export function useSpotifyPlayer(enabled) {
  const [status, setStatus] = useState(enabled ? 'loading' : 'disabled')
  const [deviceId, setDeviceId] = useState(null)
  const [playback, setPlayback] = useState(null)
  const playerRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled')
      return
    }
    let cancelled = false
    let player

    loadSdk().then((ok) => {
      if (cancelled) return
      if (!ok || !window.Spotify) {
        setStatus('unsupported')
        return
      }
      player = new window.Spotify.Player({
        name: 'SoundSelf Player',
        getOAuthToken: (cb) => {
          getAccessToken()
            .then(cb)
            .catch(() => !cancelled && setStatus('auth'))
        },
        volume: 0.7,
      })
      playerRef.current = player

      player.addListener('ready', ({ device_id }) => {
        if (cancelled) return
        setDeviceId(device_id)
        setStatus('ready')
      })
      player.addListener('not_ready', () => {
        if (!cancelled) setDeviceId(null)
      })
      player.addListener('player_state_changed', (state) => {
        if (!state || cancelled) return
        const cur = state.track_window?.current_track
        const imgs = cur?.album?.images || []
        setPlayback({
          paused: state.paused,
          trackId: cur?.id,
          name: cur?.name,
          artist: cur?.artists?.map((a) => a.name).join(', '),
          image: imgs[imgs.length - 1]?.url || imgs[0]?.url || null,
          position: state.position,
          duration: state.duration,
          updatedAt: performance.now(),
        })
      })
      player.addListener('initialization_error', () => !cancelled && setStatus('unsupported'))
      player.addListener('authentication_error', () => !cancelled && setStatus('auth'))
      player.addListener('account_error', () => !cancelled && setStatus('premium'))
      player.connect()
    })

    return () => {
      cancelled = true
      if (player) player.disconnect()
      playerRef.current = null
    }
  }, [enabled])

  const toggle = () => playerRef.current?.togglePlay()
  const seek = (ms) => playerRef.current?.seek(ms)

  return { status, deviceId, playback, toggle, seek }
}
