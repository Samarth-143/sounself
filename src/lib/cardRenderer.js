// cardRenderer.js
// Draws the shareable card directly with the Canvas 2D API instead of asking
// html2canvas to re-derive a DOM layout. html2canvas repeatedly mispositioned
// nested elements in the exported PNG (grid rows, flex gap, transformed
// ancestors) even though the live DOM card always rendered correctly — three
// separate root causes in the same rendering pass. Drawing directly removes
// the guesswork entirely: every element's position is a number we set, so
// overlap is structurally impossible rather than something to keep chasing.
//
// Tradeoff: the PNG won't be byte-identical to the live DOM card (grain
// texture is approximated, gradients are simplified) but layout correctness
// is now guaranteed by construction.

const CARD_W = 1200
const CARD_H = 675
const DISPLAY_FONT = 'Clash Display, Syne, sans-serif'
const MONO_FONT = '"IBM Plex Mono", ui-monospace, monospace'
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

const TIME_LABELS = {
  short_term: 'Last 4 Weeks',
  medium_term: 'Last 6 Months',
  long_term: 'All Time',
}

/* ------------------------------- utilities -------------------------------- */

function rgba(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// Best-effort font preload. Canvas text uses whatever is loaded at draw
// time — if Clash Display / IBM Plex Mono haven't finished loading, canvas
// silently falls back to a system font with different metrics. Forcing an
// explicit load() (not just `ready`) avoids that race deterministically.
async function ensureFonts() {
  if (!document.fonts?.load) return
  const specs = [
    '400 16px "IBM Plex Mono"',
    '500 16px "IBM Plex Mono"',
    '600 58px "Clash Display"',
    '700 58px "Clash Display"',
  ]
  try {
    await Promise.all(specs.map((s) => document.fonts.load(s)))
    await document.fonts.ready
  } catch {
    // Non-fatal — worst case falls back to a system font.
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function fillRoundRect(ctx, x, y, w, h, r, style) {
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fillStyle = style
  ctx.fill()
}

function strokeRoundRect(ctx, x, y, w, h, r, style, lineWidth = 1) {
  roundRectPath(ctx, x, y, w, h, r)
  ctx.strokeStyle = style
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

// Manual letter-spacing (ctx.letterSpacing support is inconsistent across
// browsers), with left/center/right alignment support.
function trackedWidth(ctx, text, spacing) {
  let w = 0
  for (const ch of text) w += ctx.measureText(ch).width + spacing
  return text.length ? w - spacing : 0
}

function drawTracked(ctx, text, x, y, { font, color, spacing = 0, align = 'left' }) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  const total = trackedWidth(ctx, text, spacing)
  let cx = align === 'left' ? x : align === 'center' ? x - total / 2 : x - total
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + spacing
  }
  return total
}

function truncate(ctx, text, maxWidth, font) {
  ctx.font = font
  if (ctx.measureText(text).width <= maxWidth) return text
  let lo = 0,
    hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const candidate = text.slice(0, mid) + '…'
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo) + (lo < text.length ? '…' : '')
}

function wrapLines(ctx, text, maxWidth, font, maxLines = 3) {
  ctx.font = font
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word
    if (ctx.measureText(trial).width <= maxWidth || !line) {
      line = trial
    } else {
      lines.push(line)
      line = word
    }
    if (lines.length === maxLines - 1) break
  }
  if (line) lines.push(line)
  // If any words remain unconsumed (hit maxLines), ellipsize the last line.
  const consumed = lines.join(' ').split(/\s+/).length
  if (consumed < words.length) {
    lines[lines.length - 1] = truncate(ctx, lines[lines.length - 1] + '…', maxWidth, font)
  }
  return lines
}

function drawParagraph(ctx, text, x, y, maxWidth, { font, color, lineHeight, align = 'left', maxLines = 3 }) {
  const lines = wrapLines(ctx, text, maxWidth, font, maxLines)
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight))
  ctx.textAlign = 'left'
  return lines.length * lineHeight
}

/* --------------------------------- donut ---------------------------------- */

function drawDonut(ctx, cx, cy, radius, stroke, segments, centerLabel, ink) {
  ctx.save()
  ctx.lineWidth = stroke
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()

  const total = segments.reduce((s, g) => s + g.pct, 0) || 1
  let angle = -Math.PI / 2
  for (const seg of segments) {
    const sweep = (seg.pct / total) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx, cy, radius, angle, angle + sweep)
    ctx.strokeStyle = seg.color
    ctx.lineWidth = stroke
    ctx.stroke()
    angle += sweep
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = ink
  ctx.font = `700 24px ${DISPLAY_FONT}`
  ctx.fillText(String(segments.length), cx, cy - 1)
  ctx.font = `500 8px ${MONO_FONT}`
  ctx.globalAlpha = 0.55
  ctx.fillText(centerLabel, cx, cy + 16)
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
  ctx.restore()
}

/* ------------------------------- clock face -------------------------------- */

function formatHour(h) {
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${period}`
}

function drawClock(ctx, cx, cy, size, clock, palette) {
  const { hours, peakHour } = clock
  const ri = size * 0.16
  const ro = size * 0.46
  const max = Math.max(...hours, 1)

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, ri, 0, Math.PI * 2)
  ctx.stroke()

  hours.forEach((count, h) => {
    const angle = (h / 24) * Math.PI * 2 - Math.PI / 2
    const norm = count / max
    const len = ri + norm * (ro - ri)
    const isPeak = h === peakHour
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * ri, cy + Math.sin(angle) * ri)
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
    ctx.strokeStyle = isPeak ? palette.accent : palette.glow
    ctx.lineWidth = isPeak ? 4 : 3
    ctx.globalAlpha = isPeak ? 1 : 0.35 + norm * 0.5
    ctx.lineCap = 'round'
    ctx.stroke()
  })
  ctx.globalAlpha = 1

  ctx.textAlign = 'center'
  ctx.fillStyle = palette.ink
  ctx.font = `600 11px ${MONO_FONT}`
  ctx.fillText(formatHour(peakHour), cx, cy + 4)
  ctx.textAlign = 'left'
  ctx.restore()
}

/* ------------------------------ grain overlay ------------------------------ */

let grainTile = null
function getGrainTile() {
  if (grainTile) return grainTile
  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const cx = c.getContext('2d')
  const img = cx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 255 * Math.random()
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  cx.putImageData(img, 0, 0)
  grainTile = c
  return c
}

function drawGrain(ctx, w, h, opacity = 0.05) {
  const tile = getGrainTile()
  const pattern = ctx.createPattern(tile, 'repeat')
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

/* --------------------------------- layout --------------------------------- */

const PAD_X = 48
const PAD_TOP = 36
const PAD_BOTTOM = 30
const HEADER_H = 44
const COL_GAP = 32
const LABEL_FONT = `500 11px ${MONO_FONT}`
const LABEL_SPACING = 1.6
const LABEL_COLOR_FN = (ink) => rgba(ink, 0.6)

function drawLabel(ctx, text, x, y, ink) {
  drawTracked(ctx, text.toUpperCase(), x, y, {
    font: LABEL_FONT,
    color: LABEL_COLOR_FN(ink),
    spacing: LABEL_SPACING,
  })
}

function drawSectionPill(ctx, text, x, y, { bg, border, color, font, padX = 8, padY = 4, radius = 999 }) {
  ctx.font = font
  const w = ctx.measureText(text).width + padX * 2
  const h = 14 + padY * 2
  fillRoundRect(ctx, x, y, w, h, radius, bg)
  strokeRoundRect(ctx, x, y, w, h, radius, border, 1)
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX, y + h / 2 + 1)
  ctx.textBaseline = 'alphabetic'
  return w
}

/* --------------------------------- main ------------------------------------ */

export async function renderCardCanvas(analysis, persona, { scale = 2, watermark = true } = {}) {
  await ensureFonts()

  const { archetype, genres, mood, displayName, timeRange, signatureTracks, blend, stats, clock, dnaMode, estimatedAudio } =
    analysis
  const p = archetype.palette
  const dnaLabel = dnaMode === 'artist' ? 'Artist DNA' : 'Genre DNA'
  const shortName = (n) => n.replace(/^The\s+/, '')

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W * scale
  canvas.height = CARD_H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  /* background */
  const bg = ctx.createLinearGradient(0, 0, CARD_W * 0.3, CARD_H)
  bg.addColorStop(0, p.base)
  bg.addColorStop(1, '#050505')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  const glow1 = ctx.createRadialGradient(CARD_W * 0.78, CARD_H * 0.12, 10, CARD_W * 0.78, CARD_H * 0.12, CARD_W * 0.55)
  glow1.addColorStop(0, rgba(p.glow, 0.16))
  glow1.addColorStop(1, rgba(p.glow, 0))
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  const glow2 = ctx.createRadialGradient(CARD_W * 0.1, CARD_H, 10, CARD_W * 0.1, CARD_H, CARD_W * 0.5)
  glow2.addColorStop(0, rgba(p.accent, 0.13))
  glow2.addColorStop(1, rgba(p.accent, 0))
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  drawGrain(ctx, CARD_W, CARD_H, 0.05)

  /* ---------------------------- header ---------------------------- */
  const headerBaseline = PAD_TOP + 20
  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = p.glow
  ctx.shadowColor = p.glow
  ctx.shadowBlur = 10
  ctx.arc(PAD_X + 5, headerBaseline - 5, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.font = `600 18px ${DISPLAY_FONT}`
  ctx.fillStyle = p.ink
  ctx.fillText('SoundSelf', PAD_X + 20, headerBaseline)

  // right-aligned: time pill, then name to its left
  const timeText = TIME_LABELS[timeRange] || 'Last 6 Months'
  ctx.font = `500 10px ${MONO_FONT}`
  const pillTextW = trackedWidth(ctx, timeText.toUpperCase(), 1.2)
  const pillW = pillTextW + 24
  const pillH = 22
  const pillX = CARD_W - PAD_X - pillW
  const pillY = headerBaseline - 15
  fillRoundRect(ctx, pillX, pillY, pillW, pillH, 999, rgba(p.glow, 0.13))
  strokeRoundRect(ctx, pillX, pillY, pillW, pillH, 999, rgba(p.glow, 0.4), 1)
  drawTracked(ctx, timeText.toUpperCase(), pillX + 12, pillY + 15, {
    font: `500 10px ${MONO_FONT}`,
    color: p.glow,
    spacing: 1.2,
  })

  ctx.font = `500 12px ${MONO_FONT}`
  ctx.globalAlpha = 0.7
  const nameW = trackedWidth(ctx, displayName.toUpperCase(), 1.4)
  drawTracked(ctx, displayName.toUpperCase(), pillX - 16 - nameW, headerBaseline, {
    font: `500 12px ${MONO_FONT}`,
    color: p.ink,
    spacing: 1.4,
  })
  ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD_X, PAD_TOP + HEADER_H)
  ctx.lineTo(CARD_W - PAD_X, PAD_TOP + HEADER_H)
  ctx.stroke()

  /* ---------------------------- body columns ---------------------------- */
  const bodyY = PAD_TOP + HEADER_H + 24
  const bodyBottom = CARD_H - PAD_BOTTOM
  const contentW = CARD_W - PAD_X * 2
  const usableW = contentW - COL_GAP * 2
  const colAW = usableW * 0.41
  const colBW = usableW * 0.33
  const colCW = usableW * 0.26
  const colAX = PAD_X
  const colBX = colAX + colAW + COL_GAP
  const colCX = colBX + colBW + COL_GAP

  /* ===== COLUMN A — archetype + alter ego ===== */
  let cy = bodyY
  drawLabel(ctx, 'Listening Archetype', colAX, cy + 10, p.ink)
  cy += 24

  ctx.font = `48px ${EMOJI_FONT}`
  ctx.textBaseline = 'alphabetic'
  const emojiW = ctx.measureText(archetype.emoji).width
  const titleFont = `700 58px ${DISPLAY_FONT}`
  const titleMaxWidth = colAW - emojiW - 12
  const titleLines = wrapLines(ctx, archetype.name, titleMaxWidth, titleFont, 2)
  const titleLineH = 54
  const titleBlockH = titleLines.length * titleLineH
  ctx.fillText(archetype.emoji, colAX, cy + 40)
  ctx.font = titleFont
  ctx.fillStyle = p.ink
  titleLines.forEach((line, i) => ctx.fillText(line, colAX + emojiW + 12, cy + 42 + i * titleLineH))
  cy += Math.max(48, titleBlockH) + 14

  // blend pill row
  const blendFont = `600 11px ${MONO_FONT}`
  const blendText = `${blend.primary.pct}% ${shortName(blend.primary.name)}`
  const pillW2 = drawSectionPill(ctx, blendText, colAX, cy, {
    bg: rgba(p.glow, 0.16),
    border: rgba(p.glow, 0.45),
    color: p.glow,
    font: blendFont,
  })
  ctx.font = `400 11px ${MONO_FONT}`
  ctx.fillStyle = rgba(p.ink, 0.7)
  ctx.fillText(`+ ${blend.secondary.pct}% ${shortName(blend.secondary.name)} streak`, colAX + pillW2 + 8, cy + 15)
  cy += 22 + 16

  // descriptor
  const bodyFont = `400 15px ${MONO_FONT}`
  cy += drawParagraph(ctx, `${archetype.descriptor[0]} ${archetype.descriptor[1]}`, colAX, cy + 12, colAW, {
    font: bodyFont,
    color: rgba(p.ink, 0.9),
    lineHeight: 21,
    maxLines: 3,
  })
  cy += 14

  // shadow trait
  ctx.font = `italic 400 12px ${MONO_FONT}`
  cy += drawParagraph(ctx, `Shadow — ${archetype.shadow}`, colAX, cy + 10, colAW, {
    font: `italic 400 12px ${MONO_FONT}`,
    color: p.glow,
    lineHeight: 17,
    maxLines: 2,
  })

  // ---- alter ego block, anchored to the bottom of column A ----
  const trackRowH = 22
  const trackGap = 6
  const alterEgoH =
    14 /* label */ +
    6 +
    32 /* persona name */ +
    4 +
    17 /* quote line */ +
    12 +
    signatureTracks.length * trackRowH +
    (signatureTracks.length - 1) * trackGap
  let ay = bodyBottom - alterEgoH

  drawLabel(ctx, 'Music Alter Ego', colAX, ay + 10, p.ink)
  ay += 20
  ctx.font = `600 26px ${DISPLAY_FONT}`
  ctx.fillStyle = p.accent
  const personaLine = truncate(ctx, persona.name, colAW, `600 26px ${DISPLAY_FONT}`)
  ctx.fillText(personaLine, colAX, ay + 20)
  ay += 30
  ctx.font = `italic 400 11px ${MONO_FONT}`
  ctx.fillStyle = rgba(p.ink, 0.8)
  ctx.fillText(truncate(ctx, `"${persona.quote}"`, colAW, `italic 400 11px ${MONO_FONT}`), colAX, ay + 10)
  ay += 24

  signatureTracks.forEach((t, i) => {
    fillRoundRect(ctx, colAX, ay, colAW, trackRowH - 4, 6, 'rgba(255,255,255,0.06)')
    strokeRoundRect(ctx, colAX, ay, colAW, trackRowH - 4, 6, 'rgba(255,255,255,0.1)', 1)
    ctx.font = `600 10px ${MONO_FONT}`
    ctx.fillStyle = p.glow
    const idx = String(i + 1).padStart(2, '0') + ' '
    ctx.fillText(idx, colAX + 8, ay + 12)
    const idxW = ctx.measureText(idx).width
    ctx.font = `500 10px ${MONO_FONT}`
    ctx.fillStyle = p.ink
    const rest = truncate(ctx, `${t.name} — ${t.artist}`, colAW - idxW - 16, `500 10px ${MONO_FONT}`)
    ctx.fillText(rest, colAX + 8 + idxW, ay + 12)
    ay += trackRowH + trackGap
  })

  /* ===== COLUMN B — DNA donut + mood spectrum ===== */
  let by = bodyY
  ctx.textAlign = 'center'
  drawTracked(ctx, dnaLabel.toUpperCase(), colBX + colBW / 2, by + 10, {
    font: LABEL_FONT,
    color: LABEL_COLOR_FN(p.ink),
    spacing: LABEL_SPACING,
    align: 'center',
  })
  ctx.textAlign = 'left'
  by += 24

  const donutR = 62
  const donutCx = colBX + colBW / 2
  const donutCy = by + donutR
  const segments = genres.map((g, i) => ({ ...g, color: archetype.wheel[i % archetype.wheel.length] }))
  drawDonut(ctx, donutCx, donutCy, donutR, 22, segments, dnaMode === 'artist' ? 'ARTISTS' : 'GENRES', p.ink)
  by = donutCy + donutR + 14

  // legend — explicit paired rows (see history: this is the exact structure
  // that used to break under html2canvas; here it's just direct drawing).
  const legendRowH = 16
  for (let row = 0; row < Math.ceil(segments.length / 2); row++) {
    const rowY = by + row * legendRowH
    for (let col = 0; col < 2; col++) {
      const seg = segments[row * 2 + col]
      if (!seg) continue
      const colX = colBX + col * (colBW / 2)
      const colW = colBW / 2 - (col === 0 ? 8 : 0)
      ctx.beginPath()
      ctx.fillStyle = seg.color
      ctx.arc(colX + 4, rowY + 5, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = `400 10px ${MONO_FONT}`
      const pctText = `${seg.pct}%`
      const pctW = ctx.measureText(pctText).width
      const nameMaxW = colW - 12 - pctW - 6
      ctx.fillStyle = rgba(p.ink, 0.85)
      ctx.fillText(truncate(ctx, seg.name, nameMaxW, `400 10px ${MONO_FONT}`), colX + 12, rowY + 8)
      ctx.fillStyle = seg.color
      ctx.fillText(pctText, colX + colW - pctW, rowY + 8)
    }
  }

  // ---- mood spectrum, anchored to the bottom of column B (fixed structure) ----
  const moodBars = mood.bars
  const moodBarH = 10
  const moodBarGap = 10
  const moodH =
    14 /* label row */ +
    12 +
    12 /* axis row */ +
    12 +
    6 /* axis track */ +
    20 +
    moodBars.length * moodBarH +
    (moodBars.length - 1) * moodBarGap
  let my = bodyBottom - moodH

  ctx.font = LABEL_FONT
  drawTracked(ctx, 'MOOD SPECTRUM', colBX, my + 10, { font: LABEL_FONT, color: LABEL_COLOR_FN(p.ink), spacing: LABEL_SPACING })
  if (estimatedAudio) {
    ctx.font = `500 8px ${MONO_FONT}`
    ctx.fillStyle = rgba(p.ink, 0.6)
    ctx.fillText('EST.', colBX + colBW - 24, my + 9)
  }
  my += 24

  ctx.font = `500 10px ${MONO_FONT}`
  ctx.fillStyle = rgba(p.ink, 0.6)
  ctx.fillText('MELANCHOLY', colBX, my + 8)
  const euphoricW = ctx.measureText('EUPHORIC').width
  ctx.fillText('EUPHORIC', colBX + colBW - euphoricW, my + 8)
  my += 20

  const trackY = my
  fillRoundRect(ctx, colBX, trackY, colBW, 6, 3, 'rgba(255,255,255,0.1)')
  const dotX = colBX + mood.position * colBW
  ctx.beginPath()
  ctx.fillStyle = p.glow
  ctx.shadowColor = p.glow
  ctx.shadowBlur = 10
  ctx.arc(dotX, trackY + 3, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  my += 26

  moodBars.forEach((b) => {
    const labelW = 58
    ctx.font = `500 10px ${MONO_FONT}`
    ctx.textAlign = 'right'
    ctx.fillStyle = rgba(p.ink, 0.7)
    ctx.fillText(b.label.toUpperCase(), colBX + labelW, my + 8)
    ctx.textAlign = 'left'

    const barX = colBX + labelW + 10
    const valueW = 22
    const barW = colBW - labelW - 10 - valueW - 6
    fillRoundRect(ctx, barX, my, barW, moodBarH, 5, 'rgba(255,255,255,0.08)')
    const fillW = Math.max(6, barW * b.value)
    const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0)
    grad.addColorStop(0, p.accent)
    grad.addColorStop(1, p.glow)
    fillRoundRect(ctx, barX, my, fillW, moodBarH, 5, grad)

    ctx.font = `400 10px ${MONO_FONT}`
    ctx.fillStyle = rgba(p.ink, 0.6)
    ctx.fillText(String(Math.round(b.value * 100)), barX + barW + 8, my + 8)

    my += moodBarH + moodBarGap
  })

  /* ===== COLUMN C — listening clock + stat grid ===== */
  let ccy = bodyY
  ctx.textAlign = 'center'
  drawTracked(ctx, clock ? 'LISTENING CLOCK' : 'LISTENING', colCX + colCW / 2, ccy + 10, {
    font: LABEL_FONT,
    color: LABEL_COLOR_FN(p.ink),
    spacing: LABEL_SPACING,
    align: 'center',
  })
  ctx.textAlign = 'left'
  ccy += 20

  if (clock) {
    const clockSize = 118
    const clockCx = colCX + colCW / 2
    const clockCy = ccy + clockSize / 2
    drawClock(ctx, clockCx, clockCy, clockSize, clock, p)
    ctx.textAlign = 'center'
    ctx.font = `600 13px ${DISPLAY_FONT}`
    ctx.fillStyle = p.glow
    ctx.fillText(clock.label, clockCx, clockCy + clockSize / 2 + 18)
    ctx.textAlign = 'left'
  }

  // ---- stat grid, anchored to the bottom of column C (fixed 2x2) ----
  const statRowH = 46
  const statGap = 8
  const statH = statRowH * 2 + statGap
  let sy = bodyBottom - statH
  const statColW = (colCW - statGap) / 2

  stats.slice(0, 4).forEach((s, i) => {
    const row = Math.floor(i / 2)
    const col = i % 2
    const x = colCX + col * (statColW + statGap)
    const y = sy + row * (statRowH + statGap)
    fillRoundRect(ctx, x, y, statColW, statRowH, 8, 'rgba(255,255,255,0.05)')
    strokeRoundRect(ctx, x, y, statColW, statRowH, 8, 'rgba(255,255,255,0.08)', 1)

    ctx.font = `600 20px ${DISPLAY_FONT}`
    ctx.fillStyle = p.ink
    ctx.fillText(truncate(ctx, String(s.value), statColW - 16, `600 20px ${DISPLAY_FONT}`), x + 10, y + 24)

    drawTracked(ctx, s.label.toUpperCase(), x + 10, y + 38, {
      font: `500 9px ${MONO_FONT}`,
      color: rgba(p.ink, 0.55),
      spacing: 1,
    })
  })

  /* ---------------------------- watermark ---------------------------- */
  if (watermark) {
    ctx.font = `500 11px ${MONO_FONT}`
    ctx.globalAlpha = 0.5
    const wm = 'MADE WITH ◐ SOUNDSELF'
    const wmW = trackedWidth(ctx, wm, 1.6)
    drawTracked(ctx, wm, CARD_W - PAD_X + 4 - wmW, CARD_H - 16, {
      font: `500 11px ${MONO_FONT}`,
      color: p.ink,
      spacing: 1.6,
    })
    ctx.globalAlpha = 1
  }

  return canvas
}

export async function renderCardBlob(analysis, persona, opts) {
  const canvas = await renderCardCanvas(analysis, persona, opts)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode PNG.'))), 'image/png')
  )
}
