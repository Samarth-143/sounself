// MoodSpectrum.jsx — segmented mood bars driven by 5 audio-feature dimensions.
// Fills animate in with a staggered Framer Motion sequence on mount.

import { motion } from 'framer-motion'

export default function MoodSpectrum({ mood, palette, animate = true }) {
  const { position = 0.5, bars = [] } = mood

  return (
    <div className="w-full">
      {/* Melancholy <-> Euphoric axis */}
      <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] opacity-60">
        <span>Melancholy</span>
        <span>Euphoric</span>
      </div>
      <div className="relative mb-5 h-[6px] w-full rounded-full bg-white/10">
        <motion.div
          className="absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full"
          style={{ background: palette.glow, boxShadow: `0 0 14px ${palette.glow}` }}
          initial={animate ? { left: '0%', opacity: 0 } : false}
          animate={{ left: `calc(${position * 100}% - 7px)`, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>

      <div className="space-y-2.5">
        {bars.map((b, i) => (
          <div key={b.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-right text-[10px] font-mono uppercase tracking-wider opacity-70">
              {b.label}
            </span>
            <div className="relative h-[10px] flex-1 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${palette.accent}, ${palette.glow})`,
                }}
                initial={animate ? { width: 0 } : false}
                animate={{ width: `${Math.round(b.value * 100)}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 * i }}
              />
            </div>
            <span className="w-8 shrink-0 text-[10px] font-mono tabular-nums opacity-60">
              {Math.round(b.value * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
