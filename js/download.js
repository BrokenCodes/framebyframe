import { EXT, baseName, timecodeSlug } from './format.js'
import { makeZip } from './zip.js'

/**
 * Filename for a frame.
 * @param {{index:number,time:number}} frame
 * @param {string} sourceName
 * @param {'png'|'jpeg'|'webp'} format
 * @param {'index'|'timecode'|'both'} template
 * @param {number} padTo
 */
export function frameName(frame, sourceName, format, template, padTo) {
  const prefix = baseName(sourceName)
  const idx = String(frame.index + 1).padStart(padTo, '0')
  const tc = timecodeSlug(frame.time)
  const stem = template === 'index' ? idx : template === 'timecode' ? tc : `${idx}_${tc}`
  return `${prefix}_${stem}.${EXT[format]}`
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a beat to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function saveFrame(frame, sourceName, format, template, padTo) {
  triggerDownload(frame.blob, frameName(frame, sourceName, format, template, padTo))
}

function reencodePng(frame) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = frame.width
      c.height = frame.height
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('no-canvas-context'))
      ctx.drawImage(img, 0, 0)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), 'image/png')
    }
    img.onerror = () => reject(new Error('decode-failed'))
    img.src = frame.url
  })
}

/** @returns {Promise<boolean>} false when the browser won't allow it */
export async function copyFrame(frame) {
  try {
    if (!navigator.clipboard || !('write' in navigator.clipboard)) return false
    // The clipboard only reliably accepts PNG, so re-encode anything else.
    let blob = frame.blob
    if (blob.type !== 'image/png') blob = await reencodePng(frame)
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}

/**
 * Bundles frames into a ZIP using the local store-only writer.
 * @param {{index:number,time:number,blob:Blob}[]} frames
 */
export async function saveZip(frames, sourceName, format, template) {
  const padTo = String(frames.length).length
  const files = []
  for (const frame of frames) {
    files.push({
      name: frameName(frame, sourceName, format, template, padTo),
      data: new Uint8Array(await frame.blob.arrayBuffer()),
    })
  }
  triggerDownload(makeZip(files), `${baseName(sourceName)}_frames.zip`)
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode-failed'))
    img.src = url
  })
}

/**
 * Renders selected frames into a single labelled contact sheet.
 * @param {{url:string,width:number,height:number}[]} frames
 * @param {(frame: any) => string} labelWith
 */
export async function saveContactSheet(frames, sourceName, columns, labelWith) {
  if (!frames.length) return
  const cols = Math.max(1, Math.min(columns, frames.length))
  const rows = Math.ceil(frames.length / cols)
  const cellW = 480
  const ratio = frames[0].height / frames[0].width
  const cellH = Math.round(cellW * ratio)
  const labelH = 28
  const gap = 8

  const canvas = document.createElement('canvas')
  canvas.width = cols * cellW + (cols + 1) * gap
  canvas.height = rows * (cellH + labelH) + (rows + 1) * gap
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no-canvas-context')
  ctx.fillStyle = '#0b0b0f'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < frames.length; i++) {
    const img = await loadImage(frames[i].url)
    const x = gap + (i % cols) * (cellW + gap)
    const y = gap + Math.floor(i / cols) * (cellH + labelH + gap)
    ctx.drawImage(img, x, y, cellW, cellH)
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '500 18px ui-sans-serif, system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(labelWith(frames[i]), x + 4, y + cellH + labelH / 2)
  }

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), 'image/jpeg', 0.9),
  )
  triggerDownload(blob, `${baseName(sourceName)}_contact_sheet.jpg`)
}
