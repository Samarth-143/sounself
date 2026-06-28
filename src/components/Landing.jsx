// Landing.jsx — hero + Connect CTA. Communicates demo mode when unconfigured.

import { motion } from 'framer-motion'
import { Spotify, ArrowRight } from './icons.jsx'

const ARCHES = ['Wanderer', 'Hedonist', 'Ghost', 'Architect', 'Romantic', 'Anarchist', 'Zeitgeist']

export default function Landing({ onConnect, configured }) {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-ash"
      >
        <span className="inline-block h-2 w-2 animate-floaty rounded-full bg-ember" />
        Spotify Personality Analyzer
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="font-display text-6xl font-bold leading-[0.95] tracking-[-0.03em] sm:text-7xl md:text-8xl"
      >
        Your taste has
        <br />
        <span className="bg-gradient-to-r from-ember via-gold to-acid bg-clip-text text-transparent">
          a personality.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="mt-6 max-w-xl text-sm leading-relaxed text-ash sm:text-base"
      >
        SoundSelf reads your top tracks, artists and audio DNA, then maps you to one
        of ten listening archetypes — wrapped in a card built to be shared.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.32 }}
        className="mt-9"
      >
        <button
          onClick={onConnect}
          className="group inline-flex items-center gap-3 rounded-full bg-[#1DB954] px-7 py-4 text-base font-semibold text-black transition hover:brightness-110"
        >
          <Spotify className="h-5 w-5" />
          {configured ? 'Connect Spotify' : 'Try the Demo'}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </button>
        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ash/70">
          {configured
            ? 'Secure PKCE auth · read-only access'
            : 'No credentials set — running on realistic demo data'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-16 flex flex-wrap items-center justify-center gap-2"
      >
        {ARCHES.map((a) => (
          <span
            key={a}
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ash"
          >
            The {a}
          </span>
        ))}
        <span className="text-[11px] uppercase tracking-[0.18em] text-ash/60">+ more</span>
      </motion.div>
    </div>
  )
}
