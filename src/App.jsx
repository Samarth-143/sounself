// App.jsx — screen orchestration: landing -> loading -> result.
// Handles the Spotify redirect callback, mock/demo mode, the time-range
// re-run, and demo archetype shuffling.

import { useEffect, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Landing from './components/Landing.jsx'
import Loading from './components/Loading.jsx'
import Result from './components/Result.jsx'
import { analyze } from './lib/algorithm.js'
import { generatePersona } from './lib/persona.js'
import {
  isConfigured,
  redirectToAuth,
  handleRedirectCallback,
  fetchUserData,
  hasSession,
  logout,
} from './lib/spotifyApi.js'
import { generateMockData, PROFILE_IDS } from './lib/mockData.js'

const configured = isConfigured()

export default function App() {
  const [screen, setScreen] = useState('landing') // landing | loading | result | error
  const [status, setStatus] = useState('Tuning in…')
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [persona, setPersona] = useState(null)
  const [timeRange, setTimeRange] = useState('medium_term')
  const [busyRange, setBusyRange] = useState(false)

  // Demo mode: keep a stable seed + profile so time-range changes stay coherent.
  const demo = useRef({ seed: Math.floor(Math.random() * 1e9), profileIndex: 0 })

  const buildAnalysis = useCallback((rawData) => {
    const result = analyze(rawData)
    const p = generatePersona({
      archetypeId: result.archetype.id,
      metrics: result.metrics,
      topGenre: result.genres[0]?.name || 'sound',
      displayName: result.displayName,
    })
    setAnalysis(result)
    setPersona(p)
  }, [])

  // Core loader. Works for both real Spotify and demo data.
  const load = useCallback(
    async (range, { isRangeSwitch = false } = {}) => {
      setError('')
      if (isRangeSwitch) setBusyRange(true)
      else setScreen('loading')
      try {
        let raw
        if (configured) {
          raw = await fetchUserData(range, setStatus)
        } else {
          setStatus('Spinning up demo data…')
          await new Promise((r) => setTimeout(r, isRangeSwitch ? 250 : 700))
          setStatus('Analyzing sonic DNA…')
          raw = generateMockData({
            profileId: PROFILE_IDS[demo.current.profileIndex],
            seed: demo.current.seed,
            timeRange: range,
          })
        }
        buildAnalysis(raw)
        setScreen('result')
      } catch (e) {
        setError(e?.message || 'Could not load your listening data.')
        setScreen('error')
      } finally {
        setBusyRange(false)
      }
    },
    [buildAnalysis]
  )

  // On mount: complete OAuth redirect if present, else resume existing session.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const returned = await handleRedirectCallback()
        if (cancelled) return
        if (returned || (configured && hasSession())) {
          load(timeRange)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Authentication failed.')
          setScreen('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnect = useCallback(async () => {
    if (configured) {
      try {
        await redirectToAuth()
      } catch (e) {
        setError(e?.message || 'Could not start Spotify auth.')
        setScreen('error')
      }
    } else {
      load(timeRange)
    }
  }, [load, timeRange])

  const handleTimeRange = useCallback(
    (range) => {
      if (range === timeRange || busyRange) return
      setTimeRange(range)
      load(range, { isRangeSwitch: true })
    },
    [timeRange, busyRange, load]
  )

  const handleShuffle = useCallback(() => {
    demo.current.profileIndex = (demo.current.profileIndex + 1) % PROFILE_IDS.length
    demo.current.seed = Math.floor(Math.random() * 1e9)
    load(timeRange, { isRangeSwitch: true })
  }, [load, timeRange])

  const handleReset = useCallback(() => {
    if (configured) logout()
    setAnalysis(null)
    setPersona(null)
    setScreen('landing')
  }, [])

  return (
    <div className="grain-layer relative min-h-screen">
      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <motion.div key="landing" exit={{ opacity: 0 }}>
            <Landing onConnect={handleConnect} configured={configured} />
          </motion.div>
        )}

        {screen === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loading status={status} />
          </motion.div>
        )}

        {screen === 'result' && analysis && persona && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Result
              analysis={analysis}
              persona={persona}
              timeRange={timeRange}
              onTimeRange={handleTimeRange}
              onShuffle={handleShuffle}
              onReset={handleReset}
              configured={configured}
              busyRange={busyRange}
            />
          </motion.div>
        )}

        {screen === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center"
          >
            <div className="font-display text-3xl font-semibold">Something skipped a beat</div>
            <p className="max-w-md text-sm text-ash">{error}</p>
            <button
              onClick={handleReset}
              className="rounded-full bg-ember px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Back to start
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
