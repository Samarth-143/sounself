// Loading.jsx — vinyl spinner + live status narration (not a bare spinner).

import { motion } from 'framer-motion'

export default function Loading({ status = 'Tuning in…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <div className="relative h-44 w-44">
        {/* pulsing glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,90,60,0.35), transparent 60%)' }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* vinyl */}
        <motion.div
          className="absolute inset-2 rounded-full border border-white/10"
          style={{
            background:
              'repeating-radial-gradient(circle at center, #111 0 3px, #0a0a0a 3px 6px), radial-gradient(circle at center, #1a1a1a 0 20%, transparent 21%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-ember to-gold" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
        </motion.div>
      </div>

      <div className="h-6 overflow-hidden text-center">
        <motion.p
          key={status}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="font-mono text-sm uppercase tracking-[0.25em] text-ash"
        >
          {status}
        </motion.p>
      </div>
    </div>
  )
}
