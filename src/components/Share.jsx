// Share.jsx — capture the card node to a retina PNG and offer
// Download / Copy / native Share. Watermark is toggled on only for capture.

import { useState } from 'react'
import { motion } from 'framer-motion'
import html2canvas from 'html2canvas'
import { Download, Copy, Share2, Check, Loader2 } from './icons.jsx'

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

export default function Share({ cardRef, setCapturing, fileBase = 'soundself', accent = '#ff5a3c', onBeforeCapture, onAfterCapture }) {
  const [busy, setBusy] = useState(null)
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')

  const canNativeShare =
    typeof navigator !== 'undefined' && !!navigator.canShare && !!navigator.share

  async function capture() {
    const node = cardRef.current
    if (!node) throw new Error('Card not ready yet.')
    if (typeof onBeforeCapture === 'function') onBeforeCapture()
    setCapturing(true)
    await nextFrame()
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        width: node.offsetWidth,
        height: node.offsetHeight,
      })
      return await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode PNG.'))), 'image/png')
      )
    } finally {
      setCapturing(false)
      if (typeof onAfterCapture === 'function') onAfterCapture()
    }
  }

  function flash(kind) {
    setDone(kind)
    setTimeout(() => setDone(null), 1800)
  }

  async function run(kind, fn) {
    setError('')
    setBusy(kind)
    try {
      await fn()
      flash(kind)
    } catch (e) {
      setError(e?.message || 'Something went wrong while exporting.')
    } finally {
      setBusy(null)
    }
  }

  const fileName = `${fileBase.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-soundself.png`

  const handleDownload = () =>
    run('download', async () => {
      const blob = await capture()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    })

  const handleCopy = () =>
    run('copy', async () => {
      if (!navigator.clipboard || !window.ClipboardItem)
        throw new Error('Clipboard images not supported in this browser. Use Download instead.')
      const blob = await capture()
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
    })

  const handleShare = () =>
    run('share', async () => {
      const blob = await capture()
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My SoundSelf',
          text: 'Here is my listening archetype 🎧',
        })
      } else {
        throw new Error('Native sharing unavailable. Try Download or Copy.')
      }
    })

  const Btn = ({ kind, onClick, icon: Icon, label, primary }) => (
    <button
      onClick={onClick}
      disabled={!!busy}
      className="group flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-50"
      style={
        primary
          ? { background: accent, color: '#070707' }
          : { background: 'rgba(255,255,255,0.06)', color: '#ece7df', border: '1px solid rgba(255,255,255,0.14)' }
      }
    >
      {busy === kind ? (
        <Loader2 className="h-4 w-4 animate-spin-slow" />
      ) : done === kind ? (
        <Check className="h-4 w-4" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {done === kind ? 'Done' : label}
    </button>
  )

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Btn kind="download" onClick={handleDownload} icon={Download} label="Download PNG" primary />
        <Btn kind="copy" onClick={handleCopy} icon={Copy} label="Copy" />
        {canNativeShare && <Btn kind="share" onClick={handleShare} icon={Share2} label="Share" />}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm text-center text-xs text-ember"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}
